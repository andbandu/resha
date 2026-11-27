from __future__ import annotations

import os
from decimal import Decimal
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.utils.text import slugify


def format_lkr(amount: Decimal | int | float | None, force_decimals: bool = False) -> str:
    """Format a monetary amount in Sri Lankan Rupees (e.g. Rs. 34,800 or Rs. 34,800.00)."""
    if amount is None:
        return ""
    value = Decimal(str(amount))
    if force_decimals or value != int(value):
        return f"Rs. {value:,.2f}"
    return f"Rs. {int(value):,}"


def get_s3_base_url() -> str:
    return getattr(
        settings,
        "S3_BASE_URL",
        "https://resha-images.s3.ap-southeast-2.amazonaws.com",
    ).rstrip("/")


def resolve_image_url(
    image_field=None,
    fallback_key: str = "",
    request=None,
) -> str:
    """Resolve an uploaded ImageField or S3 filename/URL to a public URL."""
    if image_field and getattr(image_field, "name", ""):
        url = image_field.url
        if request is not None and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url

    key = (fallback_key or "").strip()
    if not key:
        return ""
    if key.startswith(("http://", "https://")):
        return key

    cleaned = key.lstrip("/")
    if cleaned.lower().startswith("images/"):
        cleaned = cleaned[7:]
    encoded = quote(cleaned, safe="-_.!~*'()/")
    return f"{get_s3_base_url()}/{encoded}"


def _clean_upload_filename(filename: str) -> str:
    stem, ext = os.path.splitext(Path(filename).name)
    safe_stem = slugify(stem) or "image"
    safe_ext = ext.lower() or ".webp"
    return f"{safe_stem}{safe_ext}"


def category_image_upload_path(instance, filename: str) -> str:
    slug = slugify(getattr(instance, "slug", "") or getattr(instance, "name", "")) or "category"
    return f"categories/{slug}-{_clean_upload_filename(filename)}"


def product_image_upload_path(instance, filename: str) -> str:
    product = getattr(instance, "product", None)
    slug = slugify(getattr(product, "slug", "") or getattr(product, "name", "")) or "garment"
    return f"products/{slug}/{_clean_upload_filename(filename)}"
