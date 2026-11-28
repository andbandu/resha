from __future__ import annotations

import csv

from django.contrib import admin, messages
from django.http import HttpResponse, HttpResponseRedirect
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from products.utils import format_lkr

from .models import (
    NewsletterSubscriber,
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
    PromoCode,
    PromoType,
    StoreConfig,
)


@admin.register(StoreConfig)
class StoreConfigAdmin(admin.ModelAdmin):
    list_display = (
        "store_name",
        "free_shipping_threshold",
        "standard_shipping_cost",
        "express_shipping_cost",
        "tax_rate_percent",
        "featured_promo_code",
        "updated_at",
    )

    def has_add_permission(self, request):
        return not StoreConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        config = StoreConfig.get_solo()
        url = reverse("admin:orders_storeconfig_change", args=[config.pk])
        return HttpResponseRedirect(url)


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "description",
        "discount_badge",
        "min_order_amount",
        "usage_summary",
        "status_badge",
        "is_active",
    )
    list_filter = ("discount_type", "is_active")
    list_editable = ("is_active",)
    search_fields = ("code", "description")
    actions = ["activate_promos", "deactivate_promos"]

    @admin.display(description="Privilege")
    def discount_badge(self, obj):
        if obj.discount_type == PromoType.PERCENT:
            return format_html(
                '<span style="font-family:monospace;font-weight:600;color:#9e5e6a;">{}% OFF</span>',
                f"{obj.value:.0f}" if obj.value == int(obj.value) else f"{obj.value:.2f}",
            )
        return format_html(
            '<span style="font-family:monospace;font-weight:600;color:#9e5e6a;">{} OFF</span>',
            format_lkr(obj.value),
        )

    @admin.display(description="Usage")
    def usage_summary(self, obj):
        if obj.usage_limit is not None:
            return f"{obj.times_used} / {obj.usage_limit}"
        return f"{obj.times_used} used"

    @admin.display(description="Validity")
    def status_badge(self, obj):
        now = timezone.now()
        if not obj.is_active:
            label, bg, fg = "Inactive", "#f2f2f4", "#63636b"
        elif obj.valid_from and now < obj.valid_from:
            label, bg, fg = "Scheduled", "#fdf3e6", "#9a5b13"
        elif obj.valid_until and now > obj.valid_until:
            label, bg, fg = "Expired", "#fbe9ea", "#9f2d2d"
        elif obj.usage_limit is not None and obj.times_used >= obj.usage_limit:
            label, bg, fg = "Maxed Out", "#fbe9ea", "#9f2d2d"
        else:
            label, bg, fg = "Active", "#eaf4ef", "#1f5c42"
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:{};color:{};">{}</span>',
            bg,
            fg,
            label,
        )

    @admin.action(description="Activate selected promo codes")
    def activate_promos(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} promo code(s) activated.", messages.SUCCESS)

    @admin.action(description="Deactivate selected promo codes")
    def deactivate_promos(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} promo code(s) deactivated.", messages.SUCCESS)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = (
        "thumbnail",
        "product",
        "sku",
        "name",
        "swatch",
        "color_name",
        "size",
        "unit_price",
        "quantity",
        "line_total",
    )
    readonly_fields = ("thumbnail", "swatch", "line_total")

    @admin.display(description="Image")
    def thumbnail(self, obj):
        if obj and obj.image_url:
            return format_html(
                '<img src="{}" alt="{}" style="width:40px;height:52px;object-fit:cover;border-radius:4px;border:1px solid #e8dfe2;" />',
                obj.image_url,
                obj.name,
            )
        return "—"

    @admin.display(description="Shade")
    def swatch(self, obj):
        if not obj or not obj.color_hex:
            return "—"
        return format_html(
            '<span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:{};border:1px solid rgba(14,14,16,0.2);"></span>',
            obj.color_hex,
        )


ORDER_STATUS_COLORS = {
    OrderStatus.PENDING: ("#fdf3e6", "#9a5b13"),
    OrderStatus.CONFIRMED: ("#eef4fb", "#1e4f8a"),
    OrderStatus.PROCESSING: ("#f7ebee", "#7d4652"),
    OrderStatus.SHIPPED: ("#ecebfa", "#4338ca"),
    OrderStatus.DELIVERED: ("#eaf4ef", "#1f5c42"),
    OrderStatus.CANCELLED: ("#fbe9ea", "#9f2d2d"),
    OrderStatus.REFUNDED: ("#f2f2f4", "#63636b"),
}

PAYMENT_STATUS_COLORS = {
    PaymentStatus.PENDING: ("#fdf3e6", "#9a5b13"),
    PaymentStatus.PAID: ("#eaf4ef", "#1f5c42"),
    PaymentStatus.FAILED: ("#fbe9ea", "#9f2d2d"),
    PaymentStatus.REFUNDED: ("#f2f2f4", "#63636b"),
}


class ProcessingQueueFilter(admin.SimpleListFilter):
    title = "processing queue"
    parameter_name = "queue"

    def lookups(self, request, model_admin):
        return (
            ("needs_processing", "Needs Processing (Pending & Confirmed)"),
            ("awaiting_dispatch", "Awaiting Dispatch (Pending, Confirmed & Processing)"),
            ("completed", "Shipped & Delivered"),
        )

    def queryset(self, request, queryset):
        val = self.value()
        if val == "needs_processing":
            return queryset.filter(
                status__in=[OrderStatus.PENDING, OrderStatus.CONFIRMED]
            )
        if val == "awaiting_dispatch":
            return queryset.filter(
                status__in=[
                    OrderStatus.PENDING,
                    OrderStatus.CONFIRMED,
                    OrderStatus.PROCESSING,
                ]
            )
        if val == "completed":
            return queryset.filter(
                status__in=[OrderStatus.SHIPPED, OrderStatus.DELIVERED]
            )
        return queryset


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "placed_at",
        "shipping_name",
        "email",
        "items_count",
        "total_display",
        "payment_badge",
        "status_badge",
        "delivery_method",
        "tracking_number",
    )
    list_filter = (
        ProcessingQueueFilter,
        "status",
        "payment_status",
        "payment_method",
        "delivery_method",
        "gift_wrap",
        "placed_at",
    )
    search_fields = ("order_number", "email", "shipping_name", "phone", "tracking_number", "city")
    readonly_fields = ("order_number", "placed_at", "updated_at")
    inlines = [OrderItemInline]
    date_hierarchy = "placed_at"
    save_on_top = True
    actions = [
        "mark_confirmed",
        "mark_processing",
        "mark_shipped",
        "mark_delivered",
        "mark_paid",
        "mark_cancelled",
        "export_orders_csv",
    ]

    fieldsets = (
        (
            "Order & Fulfillment",
            {
                "fields": (
                    ("order_number", "placed_at", "updated_at"),
                    ("status", "payment_status", "payment_method"),
                    ("tracking_number",),
                    "admin_notes",
                )
            },
        ),
        (
            "Client & Shipping Destination",
            {
                "fields": (
                    ("email", "phone"),
                    ("first_name", "last_name", "shipping_name"),
                    ("address", "apartment"),
                    ("city", "state", "postal_code", "country"),
                    "shipping_address",
                )
            },
        ),
        (
            "Delivery & Gift Packaging",
            {
                "fields": (
                    ("delivery_method", "shipping_method_label", "shipping_cost"),
                    ("gift_wrap", "gift_note"),
                )
            },
        ),
        (
            "Financial Summary",
            {
                "fields": (
                    ("promo_code", "promo_code_label"),
                    ("subtotal", "discount", "tax", "total"),
                )
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("items")

    @admin.display(description="Pieces")
    def items_count(self, obj):
        qty = sum(item.quantity for item in obj.items.all())
        return f"{qty} piece{'s' if qty != 1 else ''}"

    @admin.display(description="Total", ordering="total")
    def total_display(self, obj):
        return format_html(
            '<span style="font-family:monospace;font-weight:600;">{}</span>',
            format_lkr(obj.total, force_decimals=True),
        )

    @admin.display(description="Payment", ordering="payment_status")
    def payment_badge(self, obj):
        bg, fg = PAYMENT_STATUS_COLORS.get(obj.payment_status, ("#f2f2f4", "#63636b"))
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:{};color:{};">{} ({})</span>',
            bg,
            fg,
            obj.get_payment_status_display(),
            obj.payment_method.upper(),
        )

    @admin.display(description="Order Status", ordering="status")
    def status_badge(self, obj):
        bg, fg = ORDER_STATUS_COLORS.get(obj.status, ("#f2f2f4", "#63636b"))
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:{};color:{};">{}</span>',
            bg,
            fg,
            obj.get_status_display(),
        )

    @admin.action(description="Mark selected orders as Confirmed")
    def mark_confirmed(self, request, queryset):
        updated = queryset.update(status=OrderStatus.CONFIRMED)
        self.message_user(request, f"{updated} order(s) confirmed.", messages.SUCCESS)

    @admin.action(description="Mark selected orders as Processing")
    def mark_processing(self, request, queryset):
        updated = queryset.update(status=OrderStatus.PROCESSING)
        self.message_user(request, f"{updated} order(s) moved to processing.", messages.SUCCESS)

    @admin.action(description="Mark selected orders as Shipped")
    def mark_shipped(self, request, queryset):
        updated = queryset.update(status=OrderStatus.SHIPPED)
        self.message_user(request, f"{updated} order(s) marked as shipped.", messages.SUCCESS)

    @admin.action(description="Mark selected orders as Delivered")
    def mark_delivered(self, request, queryset):
        updated = queryset.update(status=OrderStatus.DELIVERED)
        self.message_user(request, f"{updated} order(s) marked as delivered.", messages.SUCCESS)

    @admin.action(description="Mark selected orders as Paid")
    def mark_paid(self, request, queryset):
        updated = queryset.update(payment_status=PaymentStatus.PAID)
        self.message_user(request, f"{updated} order(s) marked as paid.", messages.SUCCESS)

    @admin.action(description="Cancel selected orders")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status=OrderStatus.CANCELLED)
        self.message_user(request, f"{updated} order(s) cancelled.", messages.WARNING)

    @admin.action(description="Export selected orders to CSV")
    def export_orders_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="resha-orders.csv"'
        writer = csv.writer(response)
        writer.writerow(
            [
                "Order Number",
                "Placed At",
                "Status",
                "Payment Method",
                "Payment Status",
                "Customer",
                "Email",
                "Phone",
                "Delivery Method",
                "Promo Code",
                "Subtotal",
                "Discount",
                "Shipping",
                "Tax",
                "Total",
                "Tracking Number",
            ]
        )
        for o in queryset:
            writer.writerow(
                [
                    o.order_number,
                    o.placed_at.isoformat(),
                    o.status,
                    o.payment_method,
                    o.payment_status,
                    o.shipping_name,
                    o.email,
                    o.phone,
                    o.delivery_method,
                    o.promo_code_label,
                    o.subtotal,
                    o.discount,
                    o.shipping_cost,
                    o.tax,
                    o.total,
                    o.tracking_number,
                ]
            )
        return response


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "source", "is_active", "subscribed_at")
    list_filter = ("source", "is_active", "subscribed_at")
    list_editable = ("is_active",)
    search_fields = ("email",)
    actions = ["export_subscribers_csv"]

    @admin.action(description="Export selected subscribers to CSV")
    def export_subscribers_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="resha-newsletter.csv"'
        writer = csv.writer(response)
        writer.writerow(["Email", "Source", "Active", "Subscribed At"])
        for sub in queryset:
            writer.writerow([sub.email, sub.source, sub.is_active, sub.subscribed_at.isoformat()])
        return response
