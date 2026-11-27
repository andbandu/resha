from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from products.models import Product, ProductSizeStock

from .models import DeliveryMethod, PromoCode, StoreConfig

MAX_ITEM_QUANTITY = 10


class OrderPricingError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


@dataclass
class ResolvedOrderItem:
    product: Product
    size_stock: ProductSizeStock | None
    size: str
    quantity: int
    color_name: str
    color_hex: str
    image_url: str
    unit_price: Decimal
    line_total: Decimal
    in_stock: bool
    available_stock: int


@dataclass
class AuthoritativeOrderPricing:
    config: StoreConfig
    items: list[ResolvedOrderItem]
    subtotal: Decimal
    promo: PromoCode | None
    promo_code: str
    promo_message: str
    discount: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal


def clean_decimal_number(value: Decimal) -> int | float:
    return int(value) if value == int(value) else float(value)


def _lookup_active_product(entry: dict) -> Product | None:
    """Resolve an active product, requiring all supplied identifiers to agree."""
    filters: dict = {"is_active": True}
    if entry.get("productId"):
        filters["code"] = entry["productId"].strip()
    if entry.get("slug"):
        filters["slug"] = entry["slug"].strip()
    if entry.get("sku"):
        filters["sku"] = entry["sku"].strip()

    if len(filters) == 1:
        return None

    return (
        Product.objects.filter(**filters)
        .prefetch_related("colors", "images")
        .first()
    )


def resolve_cart_items(
    raw_items: list[dict],
    *,
    lock_stock: bool = False,
    enforce_stock: bool = True,
    request=None,
) -> tuple[list[ResolvedOrderItem], Decimal]:
    """Resolve cart items and calculate subtotal strictly from DB product prices."""
    merged_items: list[ResolvedOrderItem] = []
    index_by_variant: dict[tuple[int, str, str], int] = {}
    qty_by_product_size: dict[tuple[int, str], int] = {}
    stock_by_product_size: dict[tuple[int, str], ProductSizeStock | None] = {}

    for entry in raw_items:
        product = _lookup_active_product(entry)
        if not product:
            raise OrderPricingError(
                "One or more selected garments are no longer available.",
                status_code=400,
            )

        size = entry["size"]
        qty = int(entry["quantity"])
        size_key = (product.pk, size)

        if size_key not in stock_by_product_size:
            qs = ProductSizeStock.objects.filter(product=product, size=size)
            if lock_stock:
                qs = qs.select_for_update()
            stock_by_product_size[size_key] = qs.first()

        size_stock = stock_by_product_size[size_key]
        qty_by_product_size[size_key] = qty_by_product_size.get(size_key, 0) + qty
        total_for_size = qty_by_product_size[size_key]

        if total_for_size > MAX_ITEM_QUANTITY:
            raise OrderPricingError(
                f"Maximum quantity of {MAX_ITEM_QUANTITY} exceeded for {product.name} in size {size}.",
                status_code=400,
            )

        available = size_stock.stock_count if size_stock else 0
        is_available = bool(size_stock and size_stock.in_stock and available >= total_for_size)
        if enforce_stock and not is_available:
            raise OrderPricingError(
                f"Insufficient stock for {product.name} in size {size} (available: {available}).",
                status_code=400,
            )

        color_name = (entry.get("colorName") or "").strip()
        color_obj = None
        if color_name:
            color_obj = product.colors.filter(name__iexact=color_name).first()
        if not color_obj:
            color_obj = product.colors.first()

        resolved_color_name = (
            color_obj.name if color_obj else (color_name or "Studio Shade")
        )
        resolved_color_hex = color_obj.hex if color_obj else "#0E0E10"
        resolved_image = (
            color_obj.get_image_url(request=request)
            if color_obj
            else product.get_primary_image_url(request=request)
        )

        unit_price = product.price
        variant_key = (product.pk, resolved_color_name.lower(), size)
        if variant_key in index_by_variant:
            existing = merged_items[index_by_variant[variant_key]]
            existing.quantity += qty
            existing.line_total = unit_price * existing.quantity
            existing.in_stock = is_available
            existing.available_stock = available
        else:
            index_by_variant[variant_key] = len(merged_items)
            merged_items.append(
                ResolvedOrderItem(
                    product=product,
                    size_stock=size_stock,
                    size=size,
                    quantity=qty,
                    color_name=resolved_color_name,
                    color_hex=resolved_color_hex,
                    image_url=resolved_image,
                    unit_price=unit_price,
                    line_total=unit_price * qty,
                    in_stock=is_available,
                    available_stock=available,
                )
            )

    subtotal = sum((item.line_total for item in merged_items), Decimal("0.00"))
    return merged_items, subtotal


def calculate_order_pricing(
    raw_items: list[dict],
    delivery_method: str,
    promo_code: str = "",
    *,
    lock_stock: bool = False,
    lock_promo: bool = False,
    enforce_stock: bool = True,
    strict_promo: bool = True,
    request=None,
) -> AuthoritativeOrderPricing:
    """Compute authoritative subtotal, discount, shipping, tax, and total from DB models."""
    config = StoreConfig.get_solo()
    items, subtotal = resolve_cart_items(
        raw_items,
        lock_stock=lock_stock,
        enforce_stock=enforce_stock,
        request=request,
    )

    promo: PromoCode | None = None
    promo_label = ""
    promo_message = ""
    discount = Decimal("0.00")

    raw_promo = (promo_code or "").strip().upper()
    if raw_promo:
        promo_qs = PromoCode.objects.filter(code=raw_promo)
        if lock_promo:
            promo_qs = promo_qs.select_for_update()
        promo_candidate = promo_qs.first()
        if not promo_candidate:
            if strict_promo:
                raise OrderPricingError(
                    f"Promo code '{raw_promo}' was not recognized.",
                    status_code=400,
                )
            promo_message = f"Promo code '{raw_promo}' was not recognized."
        else:
            ok, msg = promo_candidate.validate_for_subtotal(subtotal)
            if not ok:
                if strict_promo:
                    raise OrderPricingError(msg, status_code=400)
                promo_message = msg
            else:
                promo = promo_candidate
                promo_label = promo.code
                promo_message = msg
                discount = promo.calculate_discount(subtotal)

    if not items:
        shipping_cost = Decimal("0.00")
    elif delivery_method == DeliveryMethod.STANDARD:
        shipping_cost = (
            Decimal("0.00")
            if subtotal >= config.free_shipping_threshold
            else config.standard_shipping_cost
        )
    elif delivery_method == DeliveryMethod.EXPRESS:
        shipping_cost = config.express_shipping_cost
    else:
        shipping_cost = Decimal("0.00")

    discounted_subtotal = max(Decimal("0.00"), subtotal - discount)
    tax = (
        discounted_subtotal * (config.tax_rate_percent / Decimal("100"))
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = discounted_subtotal + shipping_cost + tax

    return AuthoritativeOrderPricing(
        config=config,
        items=items,
        subtotal=subtotal,
        promo=promo,
        promo_code=promo_label,
        promo_message=promo_message,
        discount=discount,
        shipping_cost=shipping_cost,
        tax=tax,
        total=total,
    )
