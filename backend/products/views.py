from __future__ import annotations

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Collection, Product
from .serializers import (
    CategorySerializer,
    CollectionSerializer,
    ProductReviewCreateSerializer,
    ProductReviewSerializer,
    ProductSerializer,
)

CATEGORY_ALIASES = {
    "dress": "Dresses",
    "dresses": "Dresses",
    "skirt": "Skirts",
    "skirts": "Skirts",
    "top": "Tops",
    "tops": "Tops",
    "pant": "Pants",
    "pants": "Pants",
    "frock": "Frocks",
    "frocks": "Frocks",
}


class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer

    def get_queryset(self):
        return (
            Category.objects.filter(is_active=True)
            .annotate(
                active_product_count=Count(
                    "products",
                    filter=Q(products__is_active=True),
                    distinct=True,
                )
            )
            .order_by("display_order", "name")
        )


class CollectionListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CollectionSerializer

    def get_queryset(self):
        return (
            Collection.objects.filter(is_active=True)
            .annotate(
                active_product_count=Count(
                    "products",
                    filter=Q(products__is_active=True),
                    distinct=True,
                )
            )
            .order_by("display_order", "name")
        )


class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = (
            Product.objects.filter(is_active=True)
            .select_related("category", "collection")
            .prefetch_related("colors", "sizes", "images", "reviews")
        )
        params = self.request.query_params

        category = (params.get("category") or "").strip()
        if category and category.lower() != "all":
            canonical = CATEGORY_ALIASES.get(category.lower(), category)
            qs = qs.filter(
                Q(category__name__iexact=canonical) | Q(category__slug__iexact=category)
            )

        collection = (params.get("collection") or "").strip()
        if collection:
            qs = qs.filter(
                Q(collection__name__iexact=collection)
                | Q(collection__slug__iexact=collection)
            )

        fabric_family = (
            params.get("fabric_family") or params.get("fabricFamily") or ""
        ).strip()
        if fabric_family:
            qs = qs.filter(fabric_family__iexact=fabric_family)

        size = (params.get("size") or "").strip().upper()
        if size:
            qs = qs.filter(sizes__size=size, sizes__in_stock=True).distinct()

        max_price = params.get("max_price") or params.get("maxPrice")
        if max_price:
            try:
                qs = qs.filter(price__lte=float(max_price))
            except (TypeError, ValueError):
                pass

        featured = (params.get("featured") or "").strip().lower()
        if featured in {"1", "true", "yes"}:
            qs = qs.filter(featured=True)

        is_new = (params.get("is_new") or params.get("isNew") or "").strip().lower()
        if is_new in {"1", "true", "yes"}:
            qs = qs.filter(is_new=True)

        query = (params.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(subtitle__icontains=query)
                | Q(sku__icontains=query)
                | Q(category__name__icontains=query)
                | Q(collection__name__icontains=query)
                | Q(fabric__icontains=query)
                | Q(fabric_family__icontains=query)
                | Q(description__icontains=query)
            )

        sort_mode = (params.get("sort") or "featured").strip().lower()
        if sort_mode == "price-asc":
            return qs.order_by("price", "code")
        if sort_mode == "price-desc":
            return qs.order_by("-price", "code")
        if sort_mode == "newest":
            return qs.order_by("-is_new", "-created_at", "code")
        if sort_mode == "rating":
            return qs.order_by("-rating", "-review_count", "code")
        return qs.order_by("-featured", "code")


class ProductDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug: str):
        product = get_object_or_404(
            Product.objects.select_related("category", "collection").prefetch_related(
                "colors", "sizes", "images", "reviews"
            ),
            slug=slug,
            is_active=True,
        )
        same_category = list(
            Product.objects.filter(is_active=True, category=product.category)
            .exclude(pk=product.pk)
            .select_related("category", "collection")
            .prefetch_related("colors", "sizes", "images", "reviews")[:4]
        )
        related = same_category
        if len(related) < 4:
            needed = 4 - len(related)
            others = list(
                Product.objects.filter(is_active=True)
                .exclude(pk__in=[product.pk, *[p.pk for p in related]])
                .select_related("category", "collection")
                .prefetch_related("colors", "sizes", "images", "reviews")[:needed]
            )
            related.extend(others)

        data = ProductSerializer(product, context={"request": request}).data
        data["relatedProducts"] = ProductSerializer(
            related, many=True, context={"request": request}
        ).data
        return Response(data)


class ProductReviewCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, slug: str):
        product = get_object_or_404(Product, slug=slug, is_active=True)
        serializer = ProductReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(
            product=product,
            date_label=timezone.now().strftime("%B %Y"),
            is_approved=True,
        )
        product.sync_rating_from_reviews()
        return Response(
            ProductReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )
