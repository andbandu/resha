from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from products.models import Category, Collection, Product, ProductReview


class CatalogAndAdminTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_catalog")
        User = get_user_model()
        cls.staff_user = User.objects.create_superuser(
            username="atelier_admin",
            email="admin@resha.example",
            password="StrongAdminPassword!123",
        )

    def test_seed_catalog_counts_and_idempotency(self):
        self.assertEqual(Category.objects.count(), 5)
        self.assertEqual(Collection.objects.count(), 6)
        self.assertEqual(Product.objects.count(), 53)
        self.assertEqual(ProductReview.objects.count(), 106)

        # Re-running seed_catalog must remain idempotent
        call_command("seed_catalog")
        self.assertEqual(Product.objects.count(), 53)
        self.assertEqual(ProductReview.objects.count(), 106)

    def test_categories_api_matches_frontend_contract(self):
        res = self.client.get("/api/categories/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(
            [c["name"] for c in data],
            ["Dresses", "Skirts", "Tops", "Pants", "Frocks"],
        )
        self.assertIn("resha-images.s3.ap-southeast-2.amazonaws.com", data[0]["image"])

    def test_products_api_filtering_and_detail(self):
        res = self.client.get("/api/products/?featured=true")
        self.assertEqual(res.status_code, 200)
        featured = res.json()
        self.assertEqual(len(featured), 6)
        self.assertEqual(featured[0]["id"], "rsh-001")
        self.assertEqual(featured[0]["slug"], "amani-dress")
        self.assertEqual(featured[0]["sku"], "RSH-DR-101")
        self.assertEqual(featured[0]["price"], 116)
        self.assertEqual(featured[0]["compareAtPrice"], 134)
        self.assertEqual(
            [s["size"] for s in featured[0]["sizes"]],
            ["XS", "S", "M", "L", "XL"],
        )
        self.assertFalse(featured[0]["sizes"][0]["inStock"])  # index 0 XS is out of stock

        # Category alias filter
        skirt_res = self.client.get("/api/products/?category=skirt&sort=price-asc")
        self.assertEqual(skirt_res.status_code, 200)
        skirts = skirt_res.json()
        self.assertTrue(all(item["category"] == "Skirts" for item in skirts))

        # Product detail with relatedProducts
        detail_res = self.client.get("/api/products/amani-dress/")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertEqual(len(detail["images"]), 4)
        self.assertEqual(len(detail["relatedProducts"]), 4)

    def test_submit_product_review(self):
        res = self.client.post(
            "/api/products/amani-dress/reviews/",
            data={
                "author": "Sana M.",
                "location": "Paris",
                "rating": 5,
                "sizePurchased": "S",
                "fitFeedback": "True to Size",
                "comment": "Crisp European linen with clean pockets.",
            },
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["author"], "Sana M.")
        product = Product.objects.get(slug="amani-dress")
        self.assertEqual(product.reviews.count(), 3)

    def test_admin_dashboard_and_product_changelist(self):
        login_page = self.client.get(reverse("admin:login"))
        self.assertEqual(login_page.status_code, 200)
        self.assertContains(login_page, "Sign in to Admin")
        self.assertContains(login_page, "Resha Studio Platform")

        self.client.force_login(self.staff_user)

        dashboard_res = self.client.get(reverse("admin:index"))
        self.assertEqual(dashboard_res.status_code, 200)
        self.assertContains(dashboard_res, "RESHA")
        self.assertContains(dashboard_res, "Rs. 0.00")
        self.assertContains(dashboard_res, "Storefront Overview")
        self.assertContains(dashboard_res, "Fulfillment Stages")
        self.assertContains(dashboard_res, "Five Pillars Breakdown")
        self.assertContains(dashboard_res, "Fabrics &amp; Collections")
        self.assertContains(dashboard_res, "Low &amp; Out-of-Stock Alerts")
        self.assertContains(dashboard_res, "Latest Reviews")

        changelist_res = self.client.get(reverse("admin:products_product_changelist"))
        self.assertEqual(changelist_res.status_code, 200)
        self.assertContains(changelist_res, "Amani Dusty Rose Pocket Dress")
        self.assertContains(changelist_res, "Rs. 116")

        # Duplicate product action
        amani = Product.objects.get(slug="amani-dress")
        dup_res = self.client.post(
            reverse("admin:products_product_changelist"),
            data={
                "action": "duplicate_products",
                "_selected_action": [str(amani.pk)],
            },
            follow=True,
        )
        self.assertEqual(dup_res.status_code, 200)
        self.assertTrue(
            Product.objects.filter(name="Amani Dusty Rose Pocket Dress (Copy)").exists()
        )
