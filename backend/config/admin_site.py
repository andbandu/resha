from __future__ import annotations

import os
from decimal import Decimal

from django.conf import settings
from django.contrib import admin
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone


class ReshaAdminSite(admin.AdminSite):
    site_header = "RESHA"
    site_title = "RESHA Atelier Admin"
    index_title = "Storefront Overview"
    site_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    def index(self, request, extra_context=None):
        from orders.models import (
            NewsletterSubscriber,
            Order,
            OrderStatus,
            PromoCode,
            StoreConfig,
        )
        from products.models import (
            Category,
            Collection,
            Product,
            ProductReview,
            ProductSizeStock,
        )
        from products.utils import format_lkr

        active_orders = Order.objects.exclude(
            status__in=[OrderStatus.CANCELLED, OrderStatus.REFUNDED]
        )
        total_revenue = active_orders.aggregate(total=Sum("total"))["total"] or Decimal("0.00")
        active_order_count = active_orders.count()
        avg_order_value = (
            (total_revenue / active_order_count).quantize(Decimal("0.01"))
            if active_order_count
            else Decimal("0.00")
        )

        now = timezone.now()
        thirty_days_ago = now - timezone.timedelta(days=30)
        revenue_30d = (
            active_orders.filter(placed_at__gte=thirty_days_ago).aggregate(
                total=Sum("total")
            )["total"]
            or Decimal("0.00")
        )

        total_orders = Order.objects.count()
        status_counts_raw = {
            row["status"]: row["cnt"]
            for row in Order.objects.values("status").annotate(cnt=Count("id"))
        }
        order_pipeline = [
            {
                "key": status_val,
                "label": status_label,
                "count": status_counts_raw.get(status_val, 0),
            }
            for status_val, status_label in [
                (OrderStatus.PENDING, "Pending"),
                (OrderStatus.CONFIRMED, "Confirmed"),
                (OrderStatus.PROCESSING, "Processing"),
                (OrderStatus.SHIPPED, "Shipped"),
                (OrderStatus.DELIVERED, "Delivered"),
            ]
        ]

        new_orders_to_process_count = (
            status_counts_raw.get(OrderStatus.PENDING, 0)
            + status_counts_raw.get(OrderStatus.CONFIRMED, 0)
        )
        pending_orders = (
            new_orders_to_process_count
            + status_counts_raw.get(OrderStatus.PROCESSING, 0)
        )
        shipped_orders = status_counts_raw.get(OrderStatus.SHIPPED, 0)

        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()
        featured_products = Product.objects.filter(is_active=True, featured=True).count()
        new_arrivals_count = Product.objects.filter(is_active=True, is_new=True).count()
        avg_catalog_rating = (
            Product.objects.filter(is_active=True).aggregate(avg=Avg("rating"))["avg"]
            or Decimal("5.0")
        )
        total_inventory_units = (
            ProductSizeStock.objects.filter(product__is_active=True).aggregate(
                units=Sum("stock_count")
            )["units"]
            or 0
        )

        low_stock_rows = (
            ProductSizeStock.objects.select_related("product", "product__category")
            .prefetch_related("product__colors", "product__images")
            .filter(product__is_active=True, stock_count__lte=4)
            .order_by("stock_count", "product__name")[:8]
        )
        low_stock_items = [
            {
                "product": item.product,
                "size": item.size,
                "stock_count": item.stock_count,
                "thumb": item.product.get_primary_image_url(request=request),
            }
            for item in low_stock_rows
        ]
        out_of_stock_count = ProductSizeStock.objects.filter(
            product__is_active=True, stock_count=0
        ).count()

        recent_orders = list(
            Order.objects.prefetch_related("items").order_by("-placed_at", "-id")[:7]
        )
        latest_order_id = (
            Order.objects.order_by("-id").values_list("id", flat=True).first() or 0
        )

        categories_raw = list(
            Category.objects.annotate(
                total_styles=Count("products", distinct=True),
                active_styles=Count(
                    "products", filter=Q(products__is_active=True), distinct=True
                ),
                stock_units=Sum(
                    "products__sizes__stock_count",
                    filter=Q(products__is_active=True),
                ),
            ).order_by("display_order", "name")
        )
        max_cat_styles = max((c.active_styles for c in categories_raw), default=1) or 1
        category_stats = [
            {
                "pk": c.pk,
                "name": c.name,
                "tagline": c.tagline,
                "active_styles": c.active_styles,
                "total_styles": c.total_styles,
                "stock_units": c.stock_units or 0,
                "bar_pct": round((c.active_styles / max_cat_styles) * 100),
                "thumb": c.get_image_url(request=request),
            }
            for c in categories_raw
        ]

        fabric_rows = list(
            Product.objects.filter(is_active=True)
            .values("fabric_family")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        fabric_breakdown = [
            {
                "name": row["fabric_family"],
                "count": row["count"],
                "pct": round((row["count"] / active_products) * 100) if active_products else 0,
            }
            for row in fabric_rows
        ]

        collection_stats = list(
            Collection.objects.filter(is_active=True)
            .annotate(
                active_styles=Count(
                    "products", filter=Q(products__is_active=True), distinct=True
                )
            )
            .order_by("display_order", "name")
        )

        recent_reviews = list(
            ProductReview.objects.select_related("product")
            .order_by("-created_at", "-id")[:5]
        )

        active_promos_count = PromoCode.objects.filter(is_active=True).count()
        promo_redemptions = (
            PromoCode.objects.aggregate(total=Sum("times_used"))["total"] or 0
        )
        subscriber_count = NewsletterSubscriber.objects.filter(is_active=True).count()
        approved_reviews_count = ProductReview.objects.filter(is_approved=True).count()
        pending_reviews_count = ProductReview.objects.filter(is_approved=False).count()
        store_config = StoreConfig.get_solo()

        dashboard_context = {
            "resha_metrics": {
                "total_revenue": total_revenue,
                "total_revenue_display": format_lkr(total_revenue, force_decimals=True),
                "revenue_30d": revenue_30d,
                "revenue_30d_display": format_lkr(revenue_30d, force_decimals=True),
                "avg_order_value": avg_order_value,
                "avg_order_value_display": format_lkr(avg_order_value, force_decimals=True),
                "total_orders": total_orders,
                "new_orders_to_process_count": new_orders_to_process_count,
                "pending_orders": pending_orders,
                "shipped_orders": shipped_orders,
                "total_products": total_products,
                "active_products": active_products,
                "featured_products": featured_products,
                "new_arrivals_count": new_arrivals_count,
                "avg_catalog_rating": round(float(avg_catalog_rating), 1),
                "total_inventory_units": total_inventory_units,
                "out_of_stock_count": out_of_stock_count,
                "active_promos_count": active_promos_count,
                "promo_redemptions": promo_redemptions,
                "subscriber_count": subscriber_count,
                "approved_reviews_count": approved_reviews_count,
                "pending_reviews_count": pending_reviews_count,
                "s3_enabled": getattr(settings, "USE_S3", False),
                "free_shipping_threshold": store_config.free_shipping_threshold,
                "free_shipping_threshold_display": format_lkr(store_config.free_shipping_threshold),
            },
            "order_pipeline": order_pipeline,
            "low_stock_items": low_stock_items,
            "recent_orders": recent_orders,
            "latest_order_id": latest_order_id,
            "new_orders_to_process_count": new_orders_to_process_count,
            "category_stats": category_stats,
            "fabric_breakdown": fabric_breakdown,
            "collection_stats": collection_stats,
            "recent_reviews": recent_reviews,
        }
        if extra_context:
            dashboard_context.update(extra_context)
        return super().index(request, extra_context=dashboard_context)
