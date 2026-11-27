from __future__ import annotations

import csv

from django.contrib import admin, messages
from django.db.models import Case, IntegerField, When
from django.http import HttpResponse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .forms import ProductAdminForm, ProductColorInlineForm
from .utils import format_lkr
from .models import (
    SIZE_SORT_ORDER,
    Category,
    Collection,
    Product,
    ProductColor,
    ProductImage,
    ProductReview,
    ProductSizeStock,
)


def _thumb_html(url: str, alt: str = "", size: int = 44) -> str:
    if not url:
        return format_html(
            '<span style="display:inline-flex;align-items:center;justify-content:center;'
            'width:{}px;height:{}px;border:1px dashed #d6c2c7;background:#faf5f6;'
            'color:#9e5e6a;font-size:10px;border-radius:4px;">No img</span>',
            size,
            size,
        )
    return format_html(
        '<img src="{}" alt="{}" loading="lazy" '
        'style="width:{}px;height:{}px;object-fit:cover;border-radius:4px;border:1px solid #e8dfe2;" />',
        url,
        alt,
        size,
        size,
    )


class StockStatusFilter(admin.SimpleListFilter):
    title = "inventory status"
    parameter_name = "stock_status"

    def lookups(self, request, model_admin):
        return (
            ("out", "Has Out-of-Stock Size (0)"),
            ("low", "Has Low Stock Size (1–4)"),
            ("healthy", "All Sizes Well Stocked (>4)"),
            ("empty", "No Sizes Configured"),
        )

    def queryset(self, request, queryset):
        val = self.value()
        if val == "out":
            return queryset.filter(sizes__stock_count=0).distinct()
        if val == "low":
            return queryset.filter(sizes__stock_count__gt=0, sizes__stock_count__lte=4).distinct()
        if val == "healthy":
            return (
                queryset.filter(sizes__isnull=False)
                .exclude(sizes__stock_count__lte=4)
                .distinct()
            )
        if val == "empty":
            return queryset.filter(sizes__isnull=True)
        return queryset


class ProductColorInline(admin.TabularInline):
    model = ProductColor
    form = ProductColorInlineForm
    extra = 1
    fields = ("preview", "name", "hex", "image", "image_key", "display_order")
    readonly_fields = ("preview",)

    @admin.display(description="Preview")
    def preview(self, obj):
        if not obj or not obj.pk:
            return "—"
        return _thumb_html(obj.get_image_url(), obj.name, size=48)


class ProductSizeStockInline(admin.TabularInline):
    model = ProductSizeStock
    extra = 0
    fields = ("size", "stock_count", "in_stock")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        order_case = Case(
            *[When(size=size, then=pos) for size, pos in SIZE_SORT_ORDER.items()],
            default=99,
            output_field=IntegerField(),
        )
        return qs.annotate(_size_order=order_case).order_by("_size_order")


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("preview", "image", "image_key", "alt", "caption", "display_order")
    readonly_fields = ("preview",)

    @admin.display(description="Preview")
    def preview(self, obj):
        if not obj or not obj.pk:
            return "—"
        return _thumb_html(obj.get_image_url(), obj.alt or obj.product.name, size=56)


class ProductReviewInline(admin.StackedInline):
    model = ProductReview
    extra = 0
    classes = ("collapse",)
    fields = (
        ("author", "location", "rating"),
        ("size_purchased", "fit_feedback", "date_label", "is_approved"),
        "comment",
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "thumbnail",
        "name",
        "tagline",
        "product_count",
        "display_order",
        "is_active",
    )
    list_display_links = ("thumbnail", "name")
    list_editable = ("display_order", "is_active")
    search_fields = ("name", "tagline", "description")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("thumbnail_large", "created_at", "updated_at")
    fieldsets = (
        (
            "Category Identity",
            {
                "fields": (
                    ("name", "slug"),
                    "tagline",
                    "description",
                    ("display_order", "is_active"),
                )
            },
        ),
        (
            "Imagery (S3 or Upload)",
            {
                "fields": ("thumbnail_large", "image", "image_key"),
            },
        ),
        (
            "Timestamps",
            {
                "classes": ("collapse",),
                "fields": ("created_at", "updated_at"),
            },
        ),
    )

    @admin.display(description="Image")
    def thumbnail(self, obj):
        return _thumb_html(obj.get_image_url(), obj.name, size=42)

    @admin.display(description="Current Preview")
    def thumbnail_large(self, obj):
        if not obj.pk:
            return "Save category to preview image."
        return _thumb_html(obj.get_image_url(), obj.name, size=110)

    @admin.display(description="Garments")
    def product_count(self, obj):
        return obj.products.count()


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "product_count", "display_order", "is_active")
    list_editable = ("display_order", "is_active")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="Garments")
    def product_count(self, obj):
        return obj.products.count()


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    list_display = (
        "thumbnail",
        "sku",
        "name",
        "category",
        "collection",
        "price_display",
        "swatch_display",
        "stock_summary",
        "featured",
        "is_new",
        "is_active",
    )
    list_display_links = ("thumbnail", "sku", "name")
    list_filter = (
        "category",
        "collection",
        "fabric_family",
        "featured",
        "is_new",
        "is_active",
        StockStatusFilter,
    )
    list_editable = ("featured", "is_new", "is_active")
    search_fields = ("name", "subtitle", "sku", "code", "slug", "fabric", "description")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("primary_preview", "created_at", "updated_at")
    inlines = [
        ProductColorInline,
        ProductSizeStockInline,
        ProductImageInline,
        ProductReviewInline,
    ]
    actions = [
        "mark_featured",
        "unmark_featured",
        "mark_new",
        "unmark_new",
        "activate_products",
        "deactivate_products",
        "duplicate_products",
        "sync_ratings_from_reviews",
        "export_products_csv",
    ]
    save_on_top = True
    list_per_page = 25

    fieldsets = (
        (
            "Garment Identity",
            {
                "fields": (
                    "primary_preview",
                    ("name", "slug"),
                    ("sku", "code"),
                    ("category", "collection"),
                    "subtitle",
                    "description",
                )
            },
        ),
        (
            "Pricing & Merchandising",
            {
                "fields": (
                    ("price", "compare_at_price", "badge"),
                    ("featured", "is_new", "is_active"),
                )
            },
        ),
        (
            "Fabric, Craft & Fit",
            {
                "fields": (
                    ("fabric_family", "gsm", "origin"),
                    "fabric",
                    "details",
                    "fit_notes",
                    "care_instructions",
                )
            },
        ),
        (
            "Client Rating Summary",
            {
                "classes": ("collapse",),
                "fields": (("rating", "review_count"), ("created_at", "updated_at")),
            },
        ),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("category", "collection")
            .prefetch_related("colors", "sizes", "images")
        )

    @admin.display(description="Photo")
    def thumbnail(self, obj):
        return _thumb_html(obj.get_primary_image_url(), obj.name, size=46)

    @admin.display(description="Look Preview")
    def primary_preview(self, obj):
        if not obj.pk:
            return "Upload images below after creating the garment."
        return _thumb_html(obj.get_primary_image_url(), obj.name, size=120)

    @admin.display(description="Price", ordering="price")
    def price_display(self, obj):
        if obj.compare_at_price:
            return format_html(
                '<span style="font-family:monospace;font-weight:600;">{}</span> '
                '<span style="font-family:monospace;font-size:11px;color:#8e8e98;text-decoration:line-through;">{}</span>',
                format_lkr(obj.price),
                format_lkr(obj.compare_at_price),
            )
        return format_html(
            '<span style="font-family:monospace;font-weight:600;">{}</span>',
            format_lkr(obj.price),
        )

    @admin.display(description="Colors")
    def swatch_display(self, obj):
        colors = list(obj.colors.all())
        if not colors:
            return "—"
        dots = "".join(
            format_html(
                '<span title="{}" style="display:inline-block;width:13px;height:13px;'
                'border-radius:999px;background:{};border:1px solid rgba(14,14,16,0.25);margin-right:4px;"></span>',
                c.name,
                c.hex,
            )
            for c in colors
        )
        return mark_safe(dots)

    @admin.display(description="Inventory (XS–XL)")
    def stock_summary(self, obj):
        sizes = {s.size: s for s in obj.sizes.all()}
        if not sizes:
            return format_html('<span style="color:#9f2d2d;font-size:11px;">Unconfigured</span>')

        ordered = ["XS", "S", "M", "L", "XL"]
        pills = []
        for label in ordered:
            item = sizes.get(label)
            if not item:
                continue
            if not item.in_stock or item.stock_count == 0:
                bg, fg = "#fbe9ea", "#9f2d2d"
            elif item.stock_count <= 4:
                bg, fg = "#fdf3e6", "#9a5b13"
            else:
                bg, fg = "#eaf4ef", "#1f5c42"
            pills.append(
                format_html(
                    '<span style="display:inline-block;padding:1px 5px;margin:1px;'
                    'border-radius:3px;font-family:monospace;font-size:10px;background:{};color:{};">'
                    '{}:{}</span>',
                    bg,
                    fg,
                    label,
                    item.stock_count,
                )
            )
        return mark_safe("".join(pills))

    @admin.action(description="Mark selected garments as Featured")
    def mark_featured(self, request, queryset):
        updated = queryset.update(featured=True)
        self.message_user(request, f"{updated} garment(s) marked as featured.", messages.SUCCESS)

    @admin.action(description="Remove Featured flag from selected garments")
    def unmark_featured(self, request, queryset):
        updated = queryset.update(featured=False)
        self.message_user(request, f"{updated} garment(s) unmarked as featured.", messages.SUCCESS)

    @admin.action(description="Mark selected garments as New Arrival")
    def mark_new(self, request, queryset):
        updated = queryset.update(is_new=True)
        self.message_user(request, f"{updated} garment(s) marked as new arrivals.", messages.SUCCESS)

    @admin.action(description="Remove New Arrival flag")
    def unmark_new(self, request, queryset):
        updated = queryset.update(is_new=False)
        self.message_user(request, f"{updated} garment(s) updated.", messages.SUCCESS)

    @admin.action(description="Activate selected garments")
    def activate_products(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} garment(s) activated.", messages.SUCCESS)

    @admin.action(description="Archive / deactivate selected garments")
    def deactivate_products(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} garment(s) deactivated.", messages.SUCCESS)

    @admin.action(description="Duplicate selected garments (draft copy)")
    def duplicate_products(self, request, queryset):
        count = 0
        for product in queryset.prefetch_related("colors", "sizes", "images"):
            colors = list(product.colors.all())
            sizes = list(product.sizes.all())
            images = list(product.images.all())

            product.pk = None
            product.code = ""
            product.sku = ""
            product.slug = ""
            product.name = f"{product.name} (Copy)"
            product.is_active = False
            product.featured = False
            product.save()

            for color in colors:
                color.pk = None
                color.product = product
                color.save()
            for size in sizes:
                size.pk = None
                size.product = product
                size.save()
            for image in images:
                image.pk = None
                image.product = product
                image.save()
            count += 1
        self.message_user(request, f"Created {count} draft copy garment(s).", messages.SUCCESS)

    @admin.action(description="Recalculate rating & count from approved reviews")
    def sync_ratings_from_reviews(self, request, queryset):
        for product in queryset:
            product.sync_rating_from_reviews()
        self.message_user(request, "Synced product ratings from approved reviews.", messages.SUCCESS)

    @admin.action(description="Export selected garments to CSV")
    def export_products_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="resha-catalog.csv"'
        writer = csv.writer(response)
        writer.writerow(
            [
                "Code",
                "SKU",
                "Name",
                "Slug",
                "Category",
                "Collection",
                "Price",
                "Compare At",
                "Fabric Family",
                "Total Stock",
                "Featured",
                "New",
                "Active",
            ]
        )
        for p in queryset.select_related("category", "collection").prefetch_related("sizes"):
            writer.writerow(
                [
                    p.code,
                    p.sku,
                    p.name,
                    p.slug,
                    p.category.name,
                    p.collection.name if p.collection else "",
                    p.price,
                    p.compare_at_price or "",
                    p.fabric_family,
                    p.total_stock(),
                    p.featured,
                    p.is_new,
                    p.is_active,
                ]
            )
        return response


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "author",
        "location",
        "stars",
        "size_purchased",
        "fit_feedback",
        "date_label",
        "is_approved",
    )
    list_filter = ("is_approved", "rating", "fit_feedback", "size_purchased", "product__category")
    list_editable = ("is_approved",)
    search_fields = ("author", "location", "comment", "product__name", "product__sku")
    actions = ["approve_reviews", "hide_reviews"]

    @admin.display(description="Rating", ordering="rating")
    def stars(self, obj):
        return format_html(
            '<span style="color:#9e5e6a;font-weight:600;">{}</span>',
            "★" * obj.rating + "☆" * (5 - obj.rating),
        )

    @admin.action(description="Approve selected reviews")
    def approve_reviews(self, request, queryset):
        updated = queryset.update(is_approved=True)
        for product in Product.objects.filter(reviews__in=queryset).distinct():
            product.sync_rating_from_reviews()
        self.message_user(request, f"{updated} review(s) approved.", messages.SUCCESS)

    @admin.action(description="Hide / unapprove selected reviews")
    def hide_reviews(self, request, queryset):
        updated = queryset.update(is_approved=False)
        for product in Product.objects.filter(reviews__in=queryset).distinct():
            product.sync_rating_from_reviews()
        self.message_user(request, f"{updated} review(s) hidden.", messages.SUCCESS)
