from __future__ import annotations

from django.contrib.admin.views.decorators import staff_member_required
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_GET
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

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
    OrderQuoteInputSerializer,
    OrderRecordSerializer,
    PromoCodeSerializer,
    PromoValidateInputSerializer,
    StoreConfigSerializer,
)
from .services import (
    OrderPricingError,
    calculate_order_pricing,
    clean_decimal_number,
    resolve_cart_items,
)


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "resha-django-backend"})


class StoreConfigView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        config = StoreConfig.get_solo()
        return Response(StoreConfigSerializer(config).data)


class PromoCodeListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = PromoCodeSerializer

    def get_queryset(self):
        return PromoCode.objects.filter(is_active=True).order_by("code")


class PromoCodeValidateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PromoValidateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_code = serializer.validated_data["code"].strip().upper()
        raw_items = serializer.validated_data.get("items", [])

        try:
            _, subtotal = resolve_cart_items(
                raw_items,
                lock_stock=False,
                enforce_stock=False,
                request=request,
            )
        except OrderPricingError as exc:
            return Response(
                {
                    "ok": False,
                    "message": exc.detail,
                    "promo": None,
                    "subtotal": 0,
                    "discountAmount": 0,
                },
                status=exc.status_code,
            )

        promo = PromoCode.objects.filter(code=raw_code).first()
        if not promo:
            return Response(
                {
                    "ok": False,
                    "message": "Code not recognized. Try RESHA10 or CASUAL20.",
                    "promo": None,
                    "subtotal": clean_decimal_number(subtotal),
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
                    "subtotal": clean_decimal_number(subtotal),
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
                "subtotal": clean_decimal_number(subtotal),
                "discountAmount": clean_decimal_number(discount),
            }
        )


class OrderQuoteView(APIView):
    """Authoritative server-computed pricing quote for cart and checkout review."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OrderQuoteInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            pricing = calculate_order_pricing(
                data.get("items", []),
                data["deliveryMethod"],
                data.get("promoCode", ""),
                lock_stock=False,
                lock_promo=False,
                enforce_stock=False,
                strict_promo=False,
                request=request,
            )
        except OrderPricingError as exc:
            return Response({"detail": exc.detail}, status=exc.status_code)

        return Response(
            {
                "items": [
                    {
                        "key": f"{item.product.code}__{item.color_name}__{item.size}",
                        "productId": item.product.code,
                        "slug": item.product.slug,
                        "sku": item.product.sku,
                        "name": item.product.name,
                        "fabric": item.product.fabric,
                        "image": item.image_url,
                        "colorName": item.color_name,
                        "colorHex": item.color_hex,
                        "size": item.size,
                        "quantity": item.quantity,
                        "unitPrice": clean_decimal_number(item.unit_price),
                        "lineTotal": clean_decimal_number(item.line_total),
                        "inStock": item.in_stock,
                        "availableStock": item.available_stock,
                    }
                    for item in pricing.items
                ],
                "subtotal": clean_decimal_number(pricing.subtotal),
                "discount": clean_decimal_number(pricing.discount),
                "shippingCost": clean_decimal_number(pricing.shipping_cost),
                "tax": clean_decimal_number(pricing.tax),
                "total": clean_decimal_number(pricing.total),
                "promoCode": pricing.promo_code,
                "promoApplied": (
                    PromoCodeSerializer(pricing.promo).data if pricing.promo else None
                ),
                "promoMessage": pricing.promo_message,
                "freeShippingThreshold": clean_decimal_number(
                    pricing.config.free_shipping_threshold
                ),
                "standardShippingCost": clean_decimal_number(
                    pricing.config.standard_shipping_cost
                ),
                "expressShippingCost": clean_decimal_number(
                    pricing.config.express_shipping_cost
                ),
                "taxRatePercent": clean_decimal_number(pricing.config.tax_rate_percent),
            }
        )


class OrderCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = CheckoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        delivery_method = data["deliveryMethod"]
        try:
            pricing = calculate_order_pricing(
                data["items"],
                delivery_method,
                data.get("promoCode", ""),
                lock_stock=True,
                lock_promo=True,
                enforce_stock=True,
                strict_promo=True,
                request=request,
            )
        except OrderPricingError as exc:
            return Response({"detail": exc.detail}, status=exc.status_code)

        if pricing.promo:
            pricing.promo.times_used = F("times_used") + 1
            pricing.promo.save(update_fields=["times_used"])

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
            shipping_cost=pricing.shipping_cost,
            promo_code=pricing.promo,
            promo_code_label=pricing.promo_code,
            subtotal=pricing.subtotal,
            discount=pricing.discount,
            tax=pricing.tax,
            total=pricing.total,
            gift_wrap=data.get("giftWrap", False),
            gift_note=data.get("giftNote", "").strip(),
            placed_at=timezone.now(),
        )

        for item in pricing.items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_code=item.product.code,
                slug=item.product.slug,
                sku=item.product.sku,
                name=item.product.name,
                fabric=item.product.fabric,
                image_url=item.image_url,
                color_name=item.color_name,
                color_hex=item.color_hex,
                size=item.size,
                unit_price=item.unit_price,
                quantity=item.quantity,
            )

            assert item.size_stock is not None
            item.size_stock.stock_count = max(
                0, item.size_stock.stock_count - item.quantity
            )
            item.size_stock.in_stock = item.size_stock.stock_count > 0
            item.size_stock.save(update_fields=["stock_count", "in_stock"])

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
    authentication_classes = []
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
    authentication_classes = []
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


@staff_member_required
@require_GET
def check_new_orders(request):
    """Low-load endpoint returning up to 10 new orders with id > last_id for admin polling."""
    raw_last_id = (request.GET.get("last_id") or "0").strip()
    try:
        last_id = int(raw_last_id)
    except (TypeError, ValueError):
        return JsonResponse(
            {"error": "Invalid last_id query parameter."},
            status=400,
        )
    if last_id < 0:
        return JsonResponse(
            {"error": "Invalid last_id query parameter."},
            status=400,
        )

    new_orders = list(Order.objects.filter(id__gt=last_id).order_by("id")[:10])
    if not new_orders:
        return JsonResponse({"has_new": False})

    latest_id = new_orders[-1].id
    orders_payload = []
    for order in new_orders:
        placed_at = (
            timezone.localtime(order.placed_at)
            if timezone.is_aware(order.placed_at)
            else order.placed_at
        )
        orders_payload.append(
            {
                "id": order.id,
                "order_number": order.order_number,
                "placed_at": placed_at.strftime("%b %d, %H:%M"),
                "shipping_name": order.shipping_name,
                "email": order.email,
                "status": order.status,
                "status_display": order.get_status_display(),
                "total": f"{order.total:.2f}",
                "admin_url": reverse("admin:orders_order_change", args=[order.pk]),
            }
        )

    return JsonResponse(
        {
            "has_new": True,
            "latest_id": latest_id,
            "count": len(new_orders),
            "orders": orders_payload,
        }
    )
