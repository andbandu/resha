from django.urls import path

from .views import (
    HealthCheckView,
    NewsletterSubscribeView,
    OrderCreateView,
    OrderLookupView,
    OrderQuoteView,
    PromoCodeListView,
    PromoCodeValidateView,
    StoreConfigView,
    check_new_orders,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="api-health"),
    path("store-config/", StoreConfigView.as_view(), name="api-store-config"),
    path("promos/", PromoCodeListView.as_view(), name="api-promo-list"),
    path("promos/validate/", PromoCodeValidateView.as_view(), name="api-promo-validate"),
    path("orders/", OrderCreateView.as_view(), name="api-order-create"),
    path("orders/quote/", OrderQuoteView.as_view(), name="api-order-quote"),
    path("orders/<str:order_number>/", OrderLookupView.as_view(), name="api-order-lookup"),
    path("check-new-orders/", check_new_orders, name="api-check-new-orders"),
    path("newsletter/", NewsletterSubscribeView.as_view(), name="api-newsletter"),
]
