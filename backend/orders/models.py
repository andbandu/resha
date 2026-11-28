from __future__ import annotations

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from products.models import Product, SizeOption


class StoreConfig(models.Model):
    store_name = models.CharField(max_length=80, default="RESHA")
    free_shipping_threshold = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("120.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    standard_shipping_cost = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("18.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    express_shipping_cost = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("32.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    tax_rate_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("8.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Tax percentage applied to discounted subtotal (e.g. 8.00 for 8%).",
    )
    announcement_text = models.CharField(
        max_length=200,
        default="Complimentary Express Shipping Over Rs. 120 · New Season Casualwear",
    )
    featured_promo_code = models.CharField(max_length=40, default="RESHA10", blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Store Settings"
        verbose_name_plural = "Store Settings"

    def __str__(self) -> str:
        return f"{self.store_name} Store Settings"

    @classmethod
    def get_solo(cls) -> "StoreConfig":
        config, _ = cls.objects.get_or_create(pk=1)
        return config


class PromoType(models.TextChoices):
    PERCENT = "percent", "Percentage (%)"
    FIXED = "fixed", "Fixed Amount (Rs.)"


class PromoCode(models.Model):
    code = models.CharField(max_length=40, unique=True)
    description = models.CharField(max_length=200)
    discount_type = models.CharField(
        max_length=10,
        choices=PromoType.choices,
        default=PromoType.PERCENT,
    )
    value = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    min_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    is_active = models.BooleanField(default=True, db_index=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} — {self.description}"

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def validate_for_subtotal(self, subtotal: Decimal) -> tuple[bool, str]:
        now = timezone.now()
        if not self.is_active:
            return False, "This privilege code is currently inactive."
        if self.valid_from and now < self.valid_from:
            return False, "This privilege code is not active yet."
        if self.valid_until and now > self.valid_until:
            return False, "This privilege code has expired."
        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            return False, "This privilege code has reached its usage limit."
        if subtotal < self.min_order_amount:
            return (
                False,
                f"Requires a minimum order of Rs. {self.min_order_amount:,.0f}.",
            )
        return True, f"{self.description} applied."

    def calculate_discount(self, subtotal: Decimal) -> Decimal:
        if subtotal <= 0:
            return Decimal("0.00")
        if self.discount_type == PromoType.PERCENT:
            raw = (subtotal * self.value) / Decimal("100")
            return raw.quantize(Decimal("1"))
        return min(self.value, subtotal)


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    PROCESSING = "processing", "Processing"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class PaymentMethod(models.TextChoices):
    CARD = "card", "Credit / Debit Card"
    COD = "cod", "Pay on Delivery"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class DeliveryMethod(models.TextChoices):
    STANDARD = "standard", "Standard Tracked Dispatch (4–6 Business Days)"
    EXPRESS = "express", "Express Air Courier (2–3 Business Days)"
    STUDIO = "studio", "Studio Pickup (Ready in 4 Hours)"


class Order(models.Model):
    order_number = models.CharField(max_length=32, unique=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    payment_method = models.CharField(
        max_length=10,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CARD,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )

    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=40, blank=True)
    first_name = models.CharField(max_length=80, blank=True)
    last_name = models.CharField(max_length=80, blank=True)
    shipping_name = models.CharField(max_length=160)

    address = models.CharField(max_length=255, blank=True)
    apartment = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True, default="")
    province = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=32, blank=True)
    country = models.CharField(max_length=80, default="Sri Lanka")
    shipping_address = models.TextField()

    delivery_method = models.CharField(
        max_length=16,
        choices=DeliveryMethod.choices,
        default=DeliveryMethod.STANDARD,
    )
    shipping_method_label = models.CharField(max_length=140, blank=True)
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    promo_code = models.ForeignKey(
        PromoCode,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
    )
    promo_code_label = models.CharField(max_length=40, blank=True)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    gift_wrap = models.BooleanField(default=False)
    gift_note = models.TextField(blank=True)
    tracking_number = models.CharField(max_length=80, blank=True)
    admin_notes = models.TextField(blank=True)

    placed_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-placed_at", "-id"]

    def __str__(self) -> str:
        return f"{self.order_number} · {self.shipping_name} (Rs. {self.total})"

    def save(self, *args, **kwargs):
        if not self.shipping_method_label:
            self.shipping_method_label = dict(DeliveryMethod.choices).get(
                self.delivery_method, ""
            )
        if not self.shipping_name and (self.first_name or self.last_name):
            self.shipping_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

        if not self.order_number:
            year = self.placed_at.year if self.placed_at else timezone.now().year
            candidate = f"RSH-{year}-{1000 + self.pk}"
            Order.objects.filter(pk=self.pk).update(order_number=candidate)
            self.order_number = candidate


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        related_name="items",
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="order_items",
    )
    product_code = models.CharField(max_length=24, blank=True)
    slug = models.SlugField(max_length=140, blank=True)
    sku = models.CharField(max_length=32, blank=True)
    name = models.CharField(max_length=180)
    fabric = models.CharField(max_length=200, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    color_name = models.CharField(max_length=80)
    color_hex = models.CharField(max_length=7, default="#0E0E10")
    size = models.CharField(max_length=4, choices=SizeOption.choices)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.name} ({self.color_name} · {self.size}) × {self.quantity}"

    def save(self, *args, **kwargs):
        self.line_total = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class NewsletterSource(models.TextChoices):
    FOOTER = "footer", "Footer"
    CHECKOUT = "checkout", "Checkout"
    ADMIN = "admin", "Admin"


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    source = models.CharField(
        max_length=20,
        choices=NewsletterSource.choices,
        default=NewsletterSource.FOOTER,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-subscribed_at"]
        verbose_name = "Newsletter Subscriber"
        verbose_name_plural = "Newsletter Subscribers"

    def __str__(self) -> str:
        return self.email
