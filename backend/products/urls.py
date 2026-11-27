from django.urls import path

from .views import (
    CategoryListView,
    CollectionListView,
    ProductDetailView,
    ProductListView,
    ProductReviewCreateView,
)

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="api-category-list"),
    path("collections/", CollectionListView.as_view(), name="api-collection-list"),
    path("products/", ProductListView.as_view(), name="api-product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="api-product-detail"),
    path(
        "products/<slug:slug>/reviews/",
        ProductReviewCreateView.as_view(),
        name="api-product-review-create",
    ),
]
