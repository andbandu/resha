from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

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


def _clean_number(value: Decimal | None):
    if value is None:
        return None
    return int(value) if value == int(value) else float(value)


class CategorySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    productCount = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "name",
            "slug",
            "tagline",
            "description",
            "image",
            "productCount",
        ]

    def get_image(self, obj: Category) -> str:
        return obj.get_image_url(request=self.context.get("request"))

    def get_productCount(self, obj: Category) -> int:
        if hasattr(obj, "active_product_count"):
            return obj.active_product_count
        return obj.products.filter(is_active=True).count()


class CollectionSerializer(serializers.ModelSerializer):
    productCount = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = ["name", "slug", "description", "productCount"]

    def get_productCount(self, obj: Collection) -> int:
        if hasattr(obj, "active_product_count"):
            return obj.active_product_count
        return obj.products.filter(is_active=True).count()


class ProductColorSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductColor
        fields = ["name", "hex", "image"]

    def get_image(self, obj: ProductColor) -> str:
        return obj.get_image_url(request=self.context.get("request"))


class ProductSizeStockSerializer(serializers.ModelSerializer):
    inStock = serializers.BooleanField(source="in_stock")
    stockCount = serializers.IntegerField(source="stock_count")

    class Meta:
        model = ProductSizeStock
        fields = ["size", "inStock", "stockCount"]


class ProductImageSerializer(serializers.ModelSerializer):
    src = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["src", "alt", "caption"]

    def get_src(self, obj: ProductImage) -> str:
        return obj.get_image_url(request=self.context.get("request"))


class ProductReviewSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    sizePurchased = serializers.CharField(source="size_purchased")
    fitFeedback = serializers.CharField(source="fit_feedback")

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "author",
            "location",
            "rating",
            "date",
            "sizePurchased",
            "fitFeedback",
            "comment",
        ]

    def get_id(self, obj: ProductReview) -> str:
        return f"rev-{obj.pk}"

    def get_date(self, obj: ProductReview) -> str:
        if obj.date_label:
            return obj.date_label
        return obj.created_at.strftime("%B %Y")


class ProductReviewCreateSerializer(serializers.ModelSerializer):
    sizePurchased = serializers.ChoiceField(
        source="size_purchased",
        choices=["XS", "S", "M", "L", "XL"],
        default="M",
    )
    fitFeedback = serializers.ChoiceField(
        source="fit_feedback",
        choices=["Runs Small", "True to Size", "Runs Large"],
        default="True to Size",
    )

    class Meta:
        model = ProductReview
        fields = [
            "author",
            "location",
            "rating",
            "sizePurchased",
            "fitFeedback",
            "comment",
        ]


class ProductSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="code")
    category = serializers.CharField(source="category.name")
    collection = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    compareAtPrice = serializers.SerializerMethodField()
    badge = serializers.SerializerMethodField()
    fabricFamily = serializers.CharField(source="fabric_family")
    fitNotes = serializers.CharField(source="fit_notes")
    careInstructions = serializers.ListField(
        source="care_instructions",
        child=serializers.CharField(),
    )
    colors = ProductColorSerializer(many=True, read_only=True)
    sizes = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    rating = serializers.SerializerMethodField()
    reviewCount = serializers.IntegerField(source="review_count")
    reviews = serializers.SerializerMethodField()
    isNew = serializers.BooleanField(source="is_new")

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "sku",
            "name",
            "subtitle",
            "category",
            "collection",
            "price",
            "compareAtPrice",
            "badge",
            "fabric",
            "fabricFamily",
            "gsm",
            "origin",
            "description",
            "details",
            "fitNotes",
            "careInstructions",
            "colors",
            "sizes",
            "images",
            "rating",
            "reviewCount",
            "reviews",
            "featured",
            "isNew",
        ]

    def get_collection(self, obj: Product) -> str:
        return obj.collection.name if obj.collection else ""

    def get_price(self, obj: Product):
        return _clean_number(obj.price)

    def get_compareAtPrice(self, obj: Product):
        return _clean_number(obj.compare_at_price)

    def get_badge(self, obj: Product):
        return obj.badge or None

    def get_rating(self, obj: Product) -> float:
        return float(obj.rating)

    def get_sizes(self, obj: Product):
        ordered = sorted(
            obj.sizes.all(),
            key=lambda s: SIZE_SORT_ORDER.get(s.size, 99),
        )
        return ProductSizeStockSerializer(ordered, many=True).data

    def get_reviews(self, obj: Product):
        approved = [r for r in obj.reviews.all() if r.is_approved]
        return ProductReviewSerializer(approved, many=True).data
