from __future__ import annotations

from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Avg
from django.utils.text import slugify

from .utils import category_image_upload_path, product_image_upload_path, resolve_image_url


HEX_COLOR_VALIDATOR = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a valid 6-digit hex color such as #B88692.",
)


class FabricFamily(models.TextChoices):
    SOFT_MULBERRY_SILK = "Soft Mulberry Silk", "Soft Mulberry Silk"
    BREATHABLE_LINEN = "Breathable Linen", "Breathable Linen"
    COMBED_COTTON = "Combed Cotton", "Combed Cotton"
    SOFT_RIB_KNIT = "Soft Rib Knit", "Soft Rib Knit"


class SizeOption(models.TextChoices):
    XS = "XS", "XS"
    S = "S", "S"
    M = "M", "M"
    L = "L", "L"
    XL = "XL", "XL"


class FitFeedback(models.TextChoices):
    RUNS_SMALL = "Runs Small", "Runs Small"
    TRUE_TO_SIZE = "True to Size", "True to Size"
    RUNS_LARGE = "Runs Large", "Runs Large"


SKU_PREFIX_BY_CATEGORY = {
    "Dresses": "DR",
    "Skirts": "SK",
    "Tops": "TP",
    "Pants": "PT",
    "Frocks": "FR",
}

SIZE_SORT_ORDER = {
    SizeOption.XS: 0,
    SizeOption.S: 1,
    SizeOption.M: 2,
    SizeOption.L: 3,
    SizeOption.XL: 4,
}


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    tagline = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(
        upload_to=category_image_upload_path,
        blank=True,
        null=True,
        help_text="Upload a category hero image (stored in S3 when USE_S3=True).",
    )
    image_key = models.CharField(
        max_length=255,
        blank=True,
        help_text="Existing S3 filename or full URL used when no new file is uploaded (e.g. 'ANGELICA DRESS image 1.webp').",
    )
    display_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["display_order", "name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_image_url(self, request=None) -> str:
        return resolve_image_url(self.image, self.image_key, request=request)


class Collection(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    description = models.TextField(blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    code = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        help_text="Frontend product ID such as rsh-001. Auto-assigned if left blank.",
    )
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    sku = models.CharField(
        max_length=32,
        unique=True,
        blank=True,
        help_text="Unique garment SKU such as RSH-DR-101. Auto-assigned if left blank.",
    )
    name = models.CharField(max_length=180)
    subtitle = models.CharField(max_length=280)
    category = models.ForeignKey(
        Category,
        related_name="products",
        on_delete=models.PROTECT,
    )
    collection = models.ForeignKey(
        Collection,
        related_name="products",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Optional original price shown with a strikethrough.",
    )
    badge = models.CharField(
        max_length=60,
        blank=True,
        help_text="Optional editorial badge (e.g. Signature, Bestseller, Atelier Pick, New Arrival).",
    )
    fabric = models.CharField(
        max_length=200,
        help_text="Full composition (e.g. 100% European Washed Linen).",
    )
    fabric_family = models.CharField(
        max_length=40,
        choices=FabricFamily.choices,
        default=FabricFamily.COMBED_COTTON,
        db_index=True,
    )
    gsm = models.CharField(max_length=40, default="160 GSM")
    origin = models.CharField(max_length=120, default="Resha Contemporary Studio")
    description = models.TextField()
    details = models.JSONField(
        default=list,
        blank=True,
        help_text="List of garment construction highlights.",
    )
    fit_notes = models.TextField(blank=True)
    care_instructions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of garment care instructions.",
    )
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=Decimal("5.0"),
        validators=[MinValueValidator(Decimal("1.0")), MaxValueValidator(Decimal("5.0"))],
    )
    review_count = models.PositiveIntegerField(default=0)
    featured = models.BooleanField(default=False, db_index=True)
    is_new = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code", "name"]
        indexes = [
            models.Index(fields=["is_active", "featured"]),
            models.Index(fields=["is_active", "is_new"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.sku})" if self.sku else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "garment"
            candidate = base_slug
            counter = 2
            while Product.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
                candidate = f"{base_slug}-{counter}"
                counter += 1
            self.slug = candidate

        super().save(*args, **kwargs)

        updates = {}
        if not self.code:
            candidate_code = f"rsh-{self.pk:03d}"
            while Product.objects.exclude(pk=self.pk).filter(code=candidate_code).exists():
                candidate_code = f"rsh-{self.pk + 1000}"
            updates["code"] = candidate_code

        if not self.sku:
            prefix = SKU_PREFIX_BY_CATEGORY.get(self.category.name, "RS")
            num = 100 + self.pk
            candidate_sku = f"RSH-{prefix}-{num}"
            while Product.objects.exclude(pk=self.pk).filter(sku=candidate_sku).exists():
                num += 1
                candidate_sku = f"RSH-{prefix}-{num}"
            updates["sku"] = candidate_sku

        if updates:
            for field, value in updates.items():
                setattr(self, field, value)
            Product.objects.filter(pk=self.pk).update(**updates)

    def get_primary_image_url(self, request=None) -> str:
        first_color = self.colors.order_by("display_order", "id").first()
        if first_color:
            url = first_color.get_image_url(request=request)
            if url:
                return url
        first_image = self.images.order_by("display_order", "id").first()
        if first_image:
            return first_image.get_image_url(request=request)
        return ""

    def total_stock(self) -> int:
        return sum(size.stock_count for size in self.sizes.all())

    def sync_rating_from_reviews(self) -> None:
        approved = self.reviews.filter(is_approved=True)
        count = approved.count()
        if count:
            avg = approved.aggregate(avg=Avg("rating"))["avg"] or 5.0
            self.rating = Decimal(str(round(float(avg), 1)))
            self.review_count = count
            self.save(update_fields=["rating", "review_count", "updated_at"])


class ProductColor(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="colors",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=80)
    hex = models.CharField(
        max_length=7,
        default="#B88692",
        validators=[HEX_COLOR_VALIDATOR],
    )
    image = models.ImageField(
        upload_to=product_image_upload_path,
        blank=True,
        null=True,
        help_text="Upload swatch hero image (stored in S3 when USE_S3=True).",
    )
    image_key = models.CharField(
        max_length=255,
        blank=True,
        help_text="Existing S3 filename or URL fallback (e.g. 'AMANI DRESS image 1.webp').",
    )
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self) -> str:
        return f"{self.product.name} — {self.name}"

    def get_image_url(self, request=None) -> str:
        url = resolve_image_url(self.image, self.image_key, request=request)
        if url:
            return url
        first_img = self.product.images.order_by("display_order", "id").first()
        return first_img.get_image_url(request=request) if first_img else ""


class ProductSizeStock(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="sizes",
        on_delete=models.CASCADE,
    )
    size = models.CharField(max_length=4, choices=SizeOption.choices)
    stock_count = models.PositiveIntegerField(default=0)
    in_stock = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Size Stock"
        verbose_name_plural = "Size Stock"
        constraints = [
            models.UniqueConstraint(
                fields=["product", "size"],
                name="unique_product_size",
            )
        ]

    def __str__(self) -> str:
        status = f"{self.stock_count} in stock" if self.in_stock else "Out of stock"
        return f"{self.product.sku} · {self.size} ({status})"

    def save(self, *args, **kwargs):
        if self.stock_count == 0:
            self.in_stock = False
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="images",
        on_delete=models.CASCADE,
    )
    image = models.ImageField(
        upload_to=product_image_upload_path,
        blank=True,
        null=True,
        help_text="Upload gallery photo (stored in S3 when USE_S3=True).",
    )
    image_key = models.CharField(
        max_length=255,
        blank=True,
        help_text="Existing S3 filename or URL fallback (e.g. 'AMANI DRESS image 1.webp').",
    )
    alt = models.CharField(max_length=255, blank=True)
    caption = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self) -> str:
        return f"{self.product.name} · Photo #{self.display_order + 1}"

    def get_image_url(self, request=None) -> str:
        return resolve_image_url(self.image, self.image_key, request=request)


class ProductReview(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="reviews",
        on_delete=models.CASCADE,
    )
    author = models.CharField(max_length=100)
    location = models.CharField(max_length=100, blank=True)
    rating = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    date_label = models.CharField(
        max_length=40,
        blank=True,
        help_text="Display month & year (e.g. November 2026).",
    )
    size_purchased = models.CharField(
        max_length=4,
        choices=SizeOption.choices,
        default=SizeOption.M,
    )
    fit_feedback = models.CharField(
        max_length=20,
        choices=FitFeedback.choices,
        default=FitFeedback.TRUE_TO_SIZE,
    )
    comment = models.TextField()
    is_approved = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self) -> str:
        return f"{self.author} ({self.rating}★) on {self.product.name}"
