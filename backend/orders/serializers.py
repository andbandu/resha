from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from products.models import SizeOption
from .models import (
    DeliveryMethod,
    NewsletterSource,
    NewsletterSubscriber,
    Order,
    OrderItem,
    PaymentMethod,
    PromoCode,
    StoreConfig,
)


def _clean_number(value: Decimal):
    return int(value) if value == int(value) else float(value)


class StoreConfigSerializer(serializers.ModelSerializer):
    storeName = serializers.CharField(source="store_name")
    freeShippingThreshold = serializers.SerializerMethodField()
    standardShippingCost = serializers.SerializerMethodField()
    expressShippingCost = serializers.SerializerMethodField()
    taxRatePercent = serializers.SerializerMethodField()
    announcementText = serializers.CharField(source="announcement_text")
    featuredPromoCode = serializers.CharField(source="featured_promo_code")

    class Meta:
        model = StoreConfig
        fields = [
            "storeName",
            "freeShippingThreshold",
            "standardShippingCost",
            "expressShippingCost",
            "taxRatePercent",
            "announcementText",
            "featuredPromoCode",
        ]

    def get_freeShippingThreshold(self, obj: StoreConfig):
        return _clean_number(obj.free_shipping_threshold)

    def get_standardShippingCost(self, obj: StoreConfig):
        return _clean_number(obj.standard_shipping_cost)

    def get_expressShippingCost(self, obj: StoreConfig):
        return _clean_number(obj.express_shipping_cost)

    def get_taxRatePercent(self, obj: StoreConfig):
        return _clean_number(obj.tax_rate_percent)


class PromoCodeSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="discount_type")
    value = serializers.SerializerMethodField()
    minOrderAmount = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = ["code", "description", "type", "value", "minOrderAmount"]

    def get_value(self, obj: PromoCode):
        return _clean_number(obj.value)

    def get_minOrderAmount(self, obj: PromoCode):
        return _clean_number(obj.min_order_amount)


class PromoValidateInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=40)
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=Decimal("0.00"),
    )


class OrderItemRecordSerializer(serializers.ModelSerializer):
    key = serializers.SerializerMethodField()
    productId = serializers.CharField(source="product_code")
    price = serializers.SerializerMethodField()
    image = serializers.CharField(source="image_url")
    colorName = serializers.CharField(source="color_name")
    colorHex = serializers.CharField(source="color_hex")

    class Meta:
        model = OrderItem
        fields = [
            "key",
            "productId",
            "slug",
            "sku",
            "name",
            "fabric",
            "price",
            "image",
            "colorName",
            "colorHex",
            "size",
            "quantity",
        ]

    def get_key(self, obj: OrderItem) -> str:
        return f"{obj.product_code}__{obj.color_name}__{obj.size}"

    def get_price(self, obj: OrderItem):
        return _clean_number(obj.unit_price)


class OrderRecordSerializer(serializers.ModelSerializer):
    orderNumber = serializers.CharField(source="order_number")
    placedAt = serializers.SerializerMethodField()
    shippingName = serializers.CharField(source="shipping_name")
    shippingAddress = serializers.CharField(source="shipping_address")
    shippingMethodLabel = serializers.CharField(source="shipping_method_label")
    shippingCost = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    giftWrap = serializers.BooleanField(source="gift_wrap")
    giftNote = serializers.SerializerMethodField()
    paymentMethod = serializers.CharField(source="payment_method")
    paymentStatus = serializers.CharField(source="payment_status")
    promoCode = serializers.CharField(source="promo_code_label", allow_blank=True)
    trackingNumber = serializers.CharField(source="tracking_number", allow_blank=True)
    items = OrderItemRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "orderNumber",
            "placedAt",
            "status",
            "paymentMethod",
            "paymentStatus",
            "email",
            "shippingName",
            "shippingAddress",
            "shippingMethodLabel",
            "shippingCost",
            "subtotal",
            "discount",
            "tax",
            "total",
            "giftWrap",
            "giftNote",
            "promoCode",
            "trackingNumber",
            "items",
        ]

    def get_placedAt(self, obj: Order) -> str:
        return obj.placed_at.strftime("%b %d, %Y")

    def get_shippingCost(self, obj: Order):
        return _clean_number(obj.shipping_cost)

    def get_subtotal(self, obj: Order):
        return _clean_number(obj.subtotal)

    def get_discount(self, obj: Order):
        return _clean_number(obj.discount)

    def get_tax(self, obj: Order):
        return _clean_number(obj.tax)

    def get_total(self, obj: Order):
        return _clean_number(obj.total)

    def get_giftNote(self, obj: Order):
        return obj.gift_note or None


class CheckoutItemInputSerializer(serializers.Serializer):
    productId = serializers.CharField(required=False, allow_blank=True)
    slug = serializers.CharField(required=False, allow_blank=True)
    sku = serializers.CharField(required=False, allow_blank=True)
    colorName = serializers.CharField(required=False, allow_blank=True, default="")
    size = serializers.ChoiceField(choices=SizeOption.choices)
    quantity = serializers.IntegerField(min_value=1, max_value=10)

    def validate(self, attrs):
        if not (attrs.get("productId") or attrs.get("slug") or attrs.get("sku")):
            raise serializers.ValidationError(
                "Each order item must specify productId, slug, or sku."
            )
        return attrs


class CheckoutCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    newsletter = serializers.BooleanField(required=False, default=False)
    firstName = serializers.CharField(max_length=80)
    lastName = serializers.CharField(max_length=80)
    phone = serializers.CharField(max_length=40)
    address = serializers.CharField(max_length=255)
    apartment = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    postalCode = serializers.CharField(max_length=32)
    country = serializers.CharField(max_length=80, required=False, default="United States")
    deliveryMethod = serializers.ChoiceField(
        choices=DeliveryMethod.choices,
        default=DeliveryMethod.STANDARD,
    )
    giftWrap = serializers.BooleanField(required=False, default=False)
    giftNote = serializers.CharField(required=False, allow_blank=True, default="")
    paymentMethod = serializers.ChoiceField(
        choices=PaymentMethod.choices,
        default=PaymentMethod.CARD,
    )
    promoCode = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    items = CheckoutItemInputSerializer(many=True, min_length=1)


class NewsletterSubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    source = serializers.ChoiceField(
        choices=NewsletterSource.choices,
        required=False,
        default=NewsletterSource.FOOTER,
    )
