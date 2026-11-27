from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from orders.models import NewsletterSubscriber, Order, OrderStatus, PromoCode
from products.models import Product, ProductSizeStock


class OrdersAndStorefrontApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_catalog")
        User = get_user_model()
        cls.staff_user = User.objects.create_superuser(
            username="orders_admin",
            email="orders@resha.example",
            password="StrongAdminPassword!123",
        )

    def test_store_config_and_promo_validation(self):
        cfg_res = self.client.get("/api/store-config/")
        self.assertEqual(cfg_res.status_code, 200)
        self.assertEqual(cfg_res.json()["freeShippingThreshold"], 120)

        promo_res = self.client.post(
            "/api/promos/validate/",
            data={"code": "resha10", "subtotal": 200},
            content_type="application/json",
        )
        self.assertEqual(promo_res.status_code, 200)
        self.assertTrue(promo_res.json()["ok"])
        self.assertEqual(promo_res.json()["discountAmount"], 20)

    def test_checkout_order_creation_stock_deduction_and_lookup(self):
        amani = Product.objects.get(slug="amani-dress")
        size_s = ProductSizeStock.objects.get(product=amani, size="S")
        starting_stock = size_s.stock_count

        payload = {
            "email": "client@example.com",
            "newsletter": True,
            "firstName": "Aanya",
            "lastName": "Mehta",
            "phone": "+1 555 234 5678",
            "address": "450 Mercer Street",
            "apartment": "Apt 4B",
            "city": "New York",
            "state": "NY",
            "postalCode": "10013",
            "country": "United States",
            "deliveryMethod": "standard",
            "giftWrap": True,
            "giftNote": "Happy Anniversary",
            "paymentMethod": "card",
            "promoCode": "RESHA10",
            "items": [
                {
                    "productId": "rsh-001",
                    "colorName": "Dusty Rose",
                    "size": "S",
                    "quantity": 2,
                }
            ],
        }
        res = self.client.post(
            "/api/orders/",
            data=payload,
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        order_data = res.json()
        # Subtotal: 116 * 2 = 232, discount 10% = 23, discounted = 209, free shipping >= 120, tax 8% = 16.72 -> total 225.72
        self.assertEqual(order_data["subtotal"], 232)
        self.assertEqual(order_data["discount"], 23)
        self.assertEqual(order_data["shippingCost"], 0)
        self.assertEqual(order_data["tax"], 16.72)
        self.assertEqual(order_data["total"], 225.72)
        self.assertEqual(order_data["status"], "confirmed")
        self.assertEqual(order_data["paymentStatus"], "paid")

        size_s.refresh_from_db()
        self.assertEqual(size_s.stock_count, starting_stock - 2)
        self.assertTrue(
            NewsletterSubscriber.objects.filter(
                email="client@example.com", source="checkout"
            ).exists()
        )
        promo = PromoCode.objects.get(code="RESHA10")
        self.assertEqual(promo.times_used, 1)

        # Lookup requires matching email
        lookup_denied = self.client.get(
            f"/api/orders/{order_data['orderNumber']}/?email=wrong@example.com"
        )
        self.assertEqual(lookup_denied.status_code, 404)

        lookup_ok = self.client.get(
            f"/api/orders/{order_data['orderNumber']}/?email=client@example.com"
        )
        self.assertEqual(lookup_ok.status_code, 200)
        self.assertEqual(lookup_ok.json()["orderNumber"], order_data["orderNumber"])

    def test_checkout_rejects_out_of_stock_size(self):
        # amani-dress XS starts at stock 0
        payload = {
            "email": "client2@example.com",
            "firstName": "Maya",
            "lastName": "Rao",
            "phone": "5551234567",
            "address": "10 Main St",
            "city": "Austin",
            "postalCode": "78701",
            "deliveryMethod": "standard",
            "paymentMethod": "cod",
            "items": [{"slug": "amani-dress", "size": "XS", "quantity": 1}],
        }
        res = self.client.post("/api/orders/", data=payload, content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Insufficient stock", res.json()["detail"])

    def test_newsletter_and_orders_admin(self):
        res = self.client.post(
            "/api/newsletter/",
            data={"email": "VIP@Example.com"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["promoCode"], "RESHA10")
        self.assertTrue(NewsletterSubscriber.objects.filter(email="vip@example.com").exists())

        self.client.force_login(self.staff_user)
        store_cfg_res = self.client.get(reverse("admin:orders_storeconfig_changelist"))
        self.assertEqual(store_cfg_res.status_code, 302)  # redirects directly to solo config

        order = Order.objects.create(
            email="buyer@example.com",
            shipping_name="Buyer Test",
            shipping_address="123 Studio Way",
            total=116,
        )
        ship_res = self.client.post(
            reverse("admin:orders_order_changelist"),
            data={"action": "mark_shipped", "_selected_action": [str(order.pk)]},
            follow=True,
        )
        self.assertEqual(ship_res.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.SHIPPED)
