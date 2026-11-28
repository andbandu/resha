from __future__ import annotations

from django.urls import NoReverseMatch, reverse

from .models import Order, OrderStatus


def admin_order_alerts(request):
    """Expose unprocessed-order count and baseline ID on Django admin pages."""
    try:
        admin_prefix = reverse("admin:index")
    except NoReverseMatch:
        return {}

    if not request.path.startswith(admin_prefix):
        return {}

    user = getattr(request, "user", None)
    if not (user and user.is_authenticated and user.is_active and user.is_staff):
        return {}

    new_orders_to_process_count = Order.objects.filter(
        status__in=[OrderStatus.PENDING, OrderStatus.CONFIRMED]
    ).count()
    latest_order_id = (
        Order.objects.order_by("-id").values_list("id", flat=True).first() or 0
    )
    return {
        "new_orders_to_process_count": new_orders_to_process_count,
        "latest_order_id": latest_order_id,
    }
