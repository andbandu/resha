from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from orders.models import PromoCode, StoreConfig
from products.models import (
    SKU_PREFIX_BY_CATEGORY,
    Category,
    Collection,
    Product,
    ProductColor,
    ProductImage,
    ProductReview,
    ProductSizeStock,
)
from products.seed_data import (
    CARE_BY_FAMILY,
    CATEGORIES_SEED,
    COLLECTIONS_SEED,
    IMAGE_CAPTIONS,
    PRODUCT_SEEDS,
    PROMO_CODES_SEED,
    REVIEWER_POOL,
)


def _build_stock_rows(index: int) -> list[tuple[str, bool, int]]:
    return [
        ("XS", index % 9 != 0, 0 if index % 9 == 0 else 4 + (index % 4)),
        ("S", True, 8 + (index % 7)),
        ("M", True, 10 + (index % 6)),
        ("L", True, 6 + (index % 5)),
        ("XL", index % 7 != 0, 0 if index % 7 == 0 else 3 + (index % 4)),
    ]


class Command(BaseCommand):
    help = "Seed the Resha Django database with categories, collections, products, inventory, reviews, promo codes, and store settings matching resha/frontend."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Reset existing products, categories, collections, and promo codes before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            Product.objects.all().delete()
            Collection.objects.all().delete()
            Category.objects.all().delete()
            PromoCode.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing catalog and promo data."))

        config = StoreConfig.get_solo()
        if "$" in config.announcement_text:
            config.announcement_text = config.announcement_text.replace("$", "Rs. ")
            config.save(update_fields=["announcement_text", "updated_at"])

        categories: dict[str, Category] = {}
        for item in CATEGORIES_SEED:
            cat, _ = Category.objects.update_or_create(
                name=item["name"],
                defaults={
                    "slug": item["slug"],
                    "tagline": item["tagline"],
                    "description": item["description"],
                    "image_key": item["image_key"],
                    "display_order": item["display_order"],
                    "is_active": True,
                },
            )
            categories[cat.name] = cat

        collections: dict[str, Collection] = {}
        for name, description, order in COLLECTIONS_SEED:
            col, _ = Collection.objects.update_or_create(
                name=name,
                defaults={
                    "description": description,
                    "display_order": order,
                    "is_active": True,
                },
            )
            collections[col.name] = col

        for promo in PROMO_CODES_SEED:
            PromoCode.objects.update_or_create(
                code=promo["code"],
                defaults={
                    "description": promo["description"],
                    "discount_type": promo["discount_type"],
                    "value": Decimal(str(promo["value"])),
                    "is_active": True,
                },
            )

        created_count = 0
        updated_count = 0
        for index, seed in enumerate(PRODUCT_SEEDS):
            code = f"rsh-{index + 1:03d}"
            sku_prefix = SKU_PREFIX_BY_CATEGORY[seed["category"]]
            sku = f"RSH-{sku_prefix}-{101 + index}"
            rating = Decimal(str(round(4.7 + ((index % 3) * 0.1), 1)))
            review_count = 12 + (index % 23)

            product, created = Product.objects.update_or_create(
                slug=seed["slug"],
                defaults={
                    "code": code,
                    "sku": sku,
                    "name": seed["name"],
                    "subtitle": seed["subtitle"],
                    "category": categories[seed["category"]],
                    "collection": collections.get(seed["collection"]),
                    "price": Decimal(str(seed["price"])),
                    "compare_at_price": (
                        Decimal(str(seed["compare_at_price"]))
                        if seed.get("compare_at_price") is not None
                        else None
                    ),
                    "badge": seed.get("badge") or "",
                    "fabric": seed["fabric"],
                    "fabric_family": seed["fabric_family"],
                    "gsm": seed["gsm"],
                    "origin": "Resha Contemporary Studio",
                    "description": seed["description"],
                    "details": seed["details"],
                    "fit_notes": seed["fit_notes"],
                    "care_instructions": CARE_BY_FAMILY[seed["fabric_family"]],
                    "rating": rating,
                    "review_count": review_count,
                    "featured": seed["featured"],
                    "is_new": seed["is_new"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

            # Sync color swatch
            first_image_key = f"{seed['prefix']} image 1.webp"
            ProductColor.objects.update_or_create(
                product=product,
                name=seed["color_name"],
                defaults={
                    "hex": seed["color_hex"],
                    "image_key": first_image_key,
                    "display_order": 0,
                },
            )

            # Sync size stock matrix
            for size_label, in_stock, stock_count in _build_stock_rows(index):
                ProductSizeStock.objects.update_or_create(
                    product=product,
                    size=size_label,
                    defaults={
                        "in_stock": in_stock,
                        "stock_count": stock_count,
                    },
                )

            # Sync gallery images cleanly
            product.images.filter(display_order__gte=seed["image_count"]).delete()
            for img_idx in range(seed["image_count"]):
                img_num = img_idx + 1
                caption = (
                    IMAGE_CAPTIONS[img_idx]
                    if img_idx < len(IMAGE_CAPTIONS)
                    else f"Detail look {img_num}"
                )
                ProductImage.objects.update_or_create(
                    product=product,
                    display_order=img_idx,
                    defaults={
                        "image_key": f"{seed['prefix']} image {img_num}.webp",
                        "alt": f"{seed['name']} in {seed['color_name']} — view {img_num}",
                        "caption": caption,
                    },
                )

            # Seed default reviews if the product does not have any yet
            if not product.reviews.exists():
                r1 = REVIEWER_POOL[index % len(REVIEWER_POOL)]
                r2 = REVIEWER_POOL[(index + 2) % len(REVIEWER_POOL)]
                ProductReview.objects.create(
                    product=product,
                    author=r1["author"],
                    location=r1["location"],
                    rating=5,
                    date_label="November 2026",
                    size_purchased=r1["size"],
                    fit_feedback="True to Size",
                    comment=(
                        f"Love how refined the {seed['name']} feels in person. "
                        f"The {seed['fabric_family'].lower()} drapes cleanly without losing structure."
                    ),
                    is_approved=True,
                )
                ProductReview.objects.create(
                    product=product,
                    author=r2["author"],
                    location=r2["location"],
                    rating=4 if index % 4 == 0 else 5,
                    date_label="October 2026",
                    size_purchased=r2["size"],
                    fit_feedback="True to Size",
                    comment=(
                        f"Effortless everyday styling in {seed['color_name']}. "
                        "Holds its finish beautifully from daytime errands to dinner."
                    ),
                    is_approved=True,
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Resha catalog seeded: {len(categories)} categories, "
                f"{len(collections)} collections, {len(PROMO_CODES_SEED)} promo codes, "
                f"{created_count} products created, {updated_count} updated."
            )
        )
