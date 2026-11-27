from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product, ProductSizeStock

from .models import (
    DeliveryMethod,
    NewsletterSource,
    NewsletterSubscriber,
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    PromoCode,
    StoreConfig,
)
from .serializers import (
    CheckoutCreateSerializer,
    NewsletterSubscribeSerializer,
    OrderRecordSerializer,
    PromoCodeSerializer,
    PromoValidateInputSerializer,
    StoreConfigSerializer,
)


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "resha-django-backend"})


class StoreConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        config = StoreConfig.get_solo()
        return Response(StoreConfigSerializer(config).data)


class PromoCodeListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PromoCodeSerializer

    def get_queryset(self):
        return PromoCode.objects.filter(is_active=True).order_by("code")


class PromoCodeValidateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PromoValidateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_code = serializer.validated_data["code"].strip().upper()
        subtotal = serializer.validated_data["subtotal"]

        promo = PromoCode.objects.filter(code=raw_code).first()
        if not promo:
            return Response(
                {
                    "ok": False,
                    "message": "Code not recognized. Try RESHA10 or CASUAL20.",
                    "promo": None,
                    "discountAmount": 0,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        ok, message = promo.validate_for_subtotal(subtotal)
        if not ok:
            return Response(
                {
                    "ok": False,
                    "message": message,
                    "promo": None,
                    "discountAmount": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        discount = promo.calculate_discount(subtotal)
        return Response(
            {
                "ok": True,
                "message": message,
                "promo": PromoCodeSerializer(promo).data,
                "discountAmount": int(discount) if discount == int(discount) else float(discount),
            }
        )


class OrderCreateView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = CheckoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        config = StoreConfig.get_solo()
        subtotal = Decimal("0.00")
        prepared_items = []

        for entry in data["items"]:
            lookup = Q()
            if entry.get("productId"):
                lookup |= Q(code=entry["productId"])
            if entry.get("slug"):
                lookup |= Q(slug=entry["slug"])
            if entry.get("sku"):
                lookup |= Q(sku=entry["sku"])

            product = (
                Product.objects.filter(lookup, is_active=True)
                .prefetch_related("colors", "images")
                .first()
            )
            if not product:
                return Response(
                    {"detail": "One or more selected garments are no longer available."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            size_stock = (
                ProductSizeStock.objects.select_for_update()
                .filter(product=product, size=entry["size"])
                .first()
            )
            qty = entry["quantity"]
            if not size_stock or not size_stock.in_stock or size_stock.stock_count < qty:
                available = size_stock.stock_count if size_stock else 0
                return Response(
                    {
                        "detail": f"Insufficient stock for {product.name} in size {entry['size']} (available: {available})."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            color_name = (entry.get("colorName") or "").strip()
            color_obj = None
            if color_name:
                color_obj = product.colors.filter(name__iexact=color_name).first()
            if not color_obj:
                color_obj = product.colors.first()

            resolved_color_name = color_obj.name if color_obj else (color_name or "Studio Shade")
            resolved_color_hex = color_obj.hex if color_obj else "#0E0E10"
            resolved_image = (
                color_obj.get_image_url(request=request)
                if color_obj
                else product.get_primary_image_url(request=request)
            )

            line_subtotal = product.price * qty
            subtotal += line_subtotal

            prepared_items.append(
                {
                    "product": product,
                    "size_stock": size_stock,
                    "quantity": qty,
                    "color_name": resolved_color_name,
                    "color_hex": resolved_color_hex,
                    "image_url": resolved_image,
                }
            )

        # Validate & apply promo code if provided
        promo = None
        promo_label = ""
        discount = Decimal("0.00")
        raw_promo = (data.get("promoCode") or "").strip().upper()
        if raw_promo:
            promo = PromoCode.objects.select_for_update().filter(code=raw_promo).first()
            if not promo:
                return Response(
                    {"detail": f"Promo code '{raw_promo}' was not recognized."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            ok, msg = promo.validate_for_subtotal(subtotal)
            if not ok:
                return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
            discount = promo.calculate_discount(subtotal)
            promo_label = promo.code
            promo.times_used = F("times_used") + 1
            promo.save(update_fields=["times_used"])

        delivery_method = data["deliveryMethod"]
        if delivery_method == DeliveryMethod.STANDARD:
            shipping_cost = (
                Decimal("0.00")
                if subtotal >= config.free_shipping_threshold
                else config.standard_shipping_cost
            )
        elif delivery_method == DeliveryMethod.EXPRESS:
            shipping_cost = config.express_shipping_cost
        else:
            shipping_cost = Decimal("0.00")

        discounted_subtotal = max(Decimal("0.00"), subtotal - discount)
        tax = (
            discounted_subtotal * (config.tax_rate_percent / Decimal("100"))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total = discounted_subtotal + shipping_cost + tax

        city_state_zip = (
            f"{data['city'].strip()}"
            f"{', ' + data['state'].strip() if data.get('state', '').strip() else ''}"
            f" {data['postalCode'].strip()}"
        )
        full_address = ", ".join(
            part
            for part in [
                data["address"].strip(),
                data.get("apartment", "").strip(),
                city_state_zip,
                data.get("country", "United States").strip(),
            ]
            if part
        )

        payment_method = data["paymentMethod"]
        is_card = payment_method == PaymentMethod.CARD

        order = Order.objects.create(
            status=OrderStatus.CONFIRMED if is_card else OrderStatus.PENDING,
            payment_method=payment_method,
            payment_status=PaymentStatus.PAID if is_card else PaymentStatus.PENDING,
            email=data["email"].strip(),
            phone=data["phone"].strip(),
            first_name=data["firstName"].strip(),
            last_name=data["lastName"].strip(),
            shipping_name=f"{data['firstName'].strip()} {data['lastName'].strip()}".strip(),
            address=data["address"].strip(),
            apartment=data.get("apartment", "").strip(),
            city=data["city"].strip(),
            state=data.get("state", "").strip(),
            postal_code=data["postalCode"].strip(),
            country=data.get("country", "United States").strip(),
            shipping_address=full_address,
            delivery_method=delivery_method,
            shipping_method_label=dict(DeliveryMethod.choices)[delivery_method],
            shipping_cost=shipping_cost,
            promo_code=promo,
            promo_code_label=promo_label,
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            total=total,
            gift_wrap=data.get("giftWrap", False),
            gift_note=data.get("giftNote", "").strip(),
            placed_at=timezone.now(),
        )

        for item in prepared_items:
            product = item["product"]
            size_stock = item["size_stock"]
            qty = item["quantity"]

            OrderItem.objects.create(
                order=order,
                product=product,
                product_code=product.code,
                slug=product.slug,
                sku=product.sku,
                name=product.name,
                fabric=product.fabric,
                image_url=item["image_url"],
                color_name=item["color_name"],
                color_hex=item["color_hex"],
                size=size_stock.size,
                unit_price=product.price,
                quantity=qty,
            )

            size_stock.stock_count = max(0, size_stock.stock_count - qty)
            size_stock.in_stock = size_stock.stock_count > 0
            size_stock.save(update_fields=["stock_count", "in_stock"])

        if data.get("newsletter"):
            NewsletterSubscriber.objects.update_or_create(
                email=data["email"].strip().lower(),
                defaults={
                    "source": NewsletterSource.CHECKOUT,
                    "is_active": True,
                },
            )

        order.refresh_from_db()
        return Response(
            OrderRecordSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OrderLookupView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, order_number: str):
        email = (request.query_params.get("email") or "").strip()
        if not email:
            return Response(
                {"detail": "Provide the order email query parameter to inspect an order."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order = get_object_or_404(
            Order.objects.prefetch_related("items"),
            order_number__iexact=order_number,
            email__iexact=email,
        )
        return Response(OrderRecordSerializer(order).data)


class NewsletterSubscribeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        source = serializer.validated_data["source"]

        sub, created = NewsletterSubscriber.objects.update_or_create(
            email=email,
            defaults={"source": source, "is_active": True},
        )
        config = StoreConfig.get_solo()
        return Response(
            {
                "ok": True,
                "created": created,
                "email": sub.email,
                "promoCode": config.featured_promo_code or "RESHA10",
                "message": "Thank you for joining Resha.",
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
