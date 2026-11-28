from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

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
            data={
                "code": "resha10",
                "items": [{"productId": "rsh-001", "size": "S", "quantity": 2}],
            },
            content_type="application/json",
        )
        self.assertEqual(promo_res.status_code, 200)
        self.assertTrue(promo_res.json()["ok"])
        self.assertEqual(promo_res.json()["subtotal"], 232)
        self.assertEqual(promo_res.json()["discountAmount"], 23)

    def test_checkout_order_creation_stock_deduction_and_lookup(self):
        amani = Product.objects.get(slug="amani-dress")
        size_s = ProductSizeStock.objects.get(product=amani, size="S")
        starting_stock = size_s.stock_count

        payload = {
            "email": "client@example.com",
            "newsletter": True,
            "firstName": "Aanya",
            "lastName": "Mehta",
            "phone": "+94 77 234 5678",
            "address": "450 Galle Road",
            "apartment": "Apt 4B",
            "city": "Colombo 03",
            "district": "Colombo",
            "province": "Western Province",
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
        self.assertIn("Colombo District, Western Province, Sri Lanka", order_data["shippingAddress"])

        saved_order = Order.objects.get(order_number=order_data["orderNumber"])
        self.assertEqual(saved_order.district, "Colombo")
        self.assertEqual(saved_order.province, "Western Province")
        self.assertEqual(saved_order.postal_code, "")
        self.assertEqual(saved_order.country, "Sri Lanka")

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

        # Mismatched district/province and invalid province are rejected
        bad_district = {**payload, "province": "Central Province", "district": "Colombo"}
        self.assertEqual(
            self.client.post("/api/orders/", data=bad_district, content_type="application/json").status_code,
            400,
        )
        bad_province = {**payload, "province": "Invalid Province", "district": "Colombo"}
        self.assertEqual(
            self.client.post("/api/orders/", data=bad_province, content_type="application/json").status_code,
            400,
        )

    def test_checkout_rejects_out_of_stock_size(self):
        # amani-dress XS starts at stock 0
        payload = {
            "email": "client2@example.com",
            "firstName": "Maya",
            "lastName": "Rao",
            "phone": "0771234567",
            "address": "10 Peradeniya Rd",
            "city": "Kandy",
            "district": "Kandy",
            "province": "Central Province",
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

    def test_promo_validation_rejects_client_pricing_fields(self):
        res = self.client.post(
            "/api/promos/validate/",
            data={
                "code": "RESHA10",
                "subtotal": 500,
                "items": [{"productId": "rsh-001", "size": "S", "quantity": 1}],
            },
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)

        res_price = self.client.post(
            "/api/promos/validate/",
            data={
                "code": "RESHA10",
                "items": [
                    {
                        "productId": "rsh-001",
                        "size": "S",
                        "quantity": 1,
                        "price": 1,
                    }
                ],
            },
            content_type="application/json",
        )
        self.assertEqual(res_price.status_code, 400)

    def test_order_quote_calculates_server_authoritative_totals(self):
        quote_res = self.client.post(
            "/api/orders/quote/",
            data={
                "deliveryMethod": "standard",
                "promoCode": "RESHA10",
                "items": [
                    {
                        "productId": "rsh-001",
                        "colorName": "Dusty Rose",
                        "size": "S",
                        "quantity": 1,
                    },
                    {
                        "productId": "rsh-001",
                        "colorName": "Dusty Rose",
                        "size": "S",
                        "quantity": 1,
                    },
                ],
            },
            content_type="application/json",
        )
        self.assertEqual(quote_res.status_code, 200)
        body = quote_res.json()
        self.assertEqual(len(body["items"]), 1)
        self.assertEqual(body["items"][0]["quantity"], 2)
        self.assertEqual(body["items"][0]["unitPrice"], 116)
        self.assertEqual(body["items"][0]["lineTotal"], 232)
        self.assertEqual(body["subtotal"], 232)
        self.assertEqual(body["discount"], 23)
        self.assertEqual(body["shippingCost"], 0)
        self.assertEqual(body["tax"], 16.72)
        self.assertEqual(body["total"], 225.72)

        tampered_quote = self.client.post(
            "/api/orders/quote/",
            data={
                "deliveryMethod": "standard",
                "shippingCost": 0,
                "items": [{"productId": "rsh-001", "size": "S", "quantity": 1}],
            },
            content_type="application/json",
        )
        self.assertEqual(tampered_quote.status_code, 400)

    def test_checkout_rejects_client_pricing_mismatch_and_split_stock_bypass(self):
        base_payload = {
            "email": "security@example.com",
            "firstName": "Leela",
            "lastName": "Sen",
            "phone": "0771234567",
            "address": "10 Main St",
            "city": "Galle",
            "district": "Galle",
            "province": "Southern Province",
            "postalCode": "80000",
            "deliveryMethod": "standard",
            "paymentMethod": "cod",
            "items": [{"productId": "rsh-001", "size": "S", "quantity": 1}],
        }

        for key, value in [
            ("subtotal", 1),
            ("discount", 100),
            ("shippingCost", 0),
            ("tax", 0),
            ("total", 1),
            ("status", "delivered"),
            ("paymentStatus", "paid"),
        ]:
            bad_payload = {**base_payload, key: value}
            res = self.client.post(
                "/api/orders/",
                data=bad_payload,
                content_type="application/json",
            )
            self.assertEqual(res.status_code, 400, f"Expected 400 for {key}")

        for item_key in ("price", "unitPrice", "unit_price", "lineTotal"):
            bad_item_payload = {
                **base_payload,
                "items": [
                    {
                        "productId": "rsh-001",
                        "size": "S",
                        "quantity": 1,
                        item_key: 1,
                    }
                ],
            }
            res = self.client.post(
                "/api/orders/",
                data=bad_item_payload,
                content_type="application/json",
            )
            self.assertEqual(res.status_code, 400, f"Expected 400 for item {item_key}")

        other_product = Product.objects.exclude(code="rsh-001").first()
        mismatch_payload = {
            **base_payload,
            "items": [
                {
                    "productId": "rsh-001",
                    "slug": other_product.slug,
                    "size": "S",
                    "quantity": 1,
                }
            ],
        }
        mismatch_res = self.client.post(
            "/api/orders/",
            data=mismatch_payload,
            content_type="application/json",
        )
        self.assertEqual(mismatch_res.status_code, 400)

        amani = Product.objects.get(code="rsh-001")
        size_s = ProductSizeStock.objects.get(product=amani, size="S")
        starting_stock = size_s.stock_count

        split_stock_payload = {
            **base_payload,
            "items": [
                {"productId": "rsh-001", "size": "S", "quantity": starting_stock - 1},
                {"productId": "rsh-001", "size": "S", "quantity": 2},
            ],
        }
        split_res = self.client.post(
            "/api/orders/",
            data=split_stock_payload,
            content_type="application/json",
        )
        self.assertEqual(split_res.status_code, 400)

        over_cap_payload = {
            **base_payload,
            "items": [
                {"productId": "rsh-001", "size": "S", "quantity": 6},
                {"productId": "rsh-001", "size": "S", "quantity": 5},
            ],
        }
        cap_res = self.client.post(
            "/api/orders/",
            data=over_cap_payload,
            content_type="application/json",
        )
        self.assertEqual(cap_res.status_code, 400)

        size_s.refresh_from_db()
        self.assertEqual(size_s.stock_count, starting_stock)

    def test_public_post_endpoints_allow_session_cookie_without_csrf_token(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.force_login(self.staff_user)

        promo_res = csrf_client.post(
            "/api/promos/validate/",
            data={
                "code": "RESHA10",
                "items": [{"productId": "rsh-001", "size": "S", "quantity": 2}],
            },
            format="json",
        )
        self.assertEqual(promo_res.status_code, 200)

        quote_res = csrf_client.post(
            "/api/orders/quote/",
            data={
                "deliveryMethod": "standard",
                "promoCode": "RESHA10",
                "items": [{"productId": "rsh-001", "size": "S", "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(quote_res.status_code, 200)

        order_res = csrf_client.post(
            "/api/orders/",
            data={
                "email": "csrf@example.com",
                "firstName": "Nadia",
                "lastName": "Khan",
                "phone": "0771112222",
                "address": "20 Studio Row",
                "city": "Colombo 07",
                "district": "Colombo",
                "province": "Western Province",
                "deliveryMethod": "standard",
                "paymentMethod": "cod",
                "items": [{"productId": "rsh-001", "size": "S", "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(order_res.status_code, 201)

    def test_dashboard_context_and_check_new_orders_smart_polling_endpoint(self):
        User = get_user_model()
        regular_user = User.objects.create_user(
            username="regular_shopper",
            email="shopper@resha.example",
            password="ShopperPassword!123",
        )

        # Unauthenticated and non-staff requests are blocked by @staff_member_required
        anon_res = self.client.get("/api/check-new-orders/?last_id=0")
        self.assertEqual(anon_res.status_code, 302)
        self.assertIn("/admin/login/", anon_res["Location"])

        self.client.force_login(regular_user)
        non_staff_res = self.client.get("/api/check-new-orders/?last_id=0")
        self.assertEqual(non_staff_res.status_code, 302)
        self.assertIn("/admin/login/", non_staff_res["Location"])

        # Unauthenticated login page should not expose polling/alerts markup
        login_html = self.client.get(reverse("admin:login")).content.decode("utf-8")
        self.assertNotIn("resha-header-orders-pill", login_html)
        self.assertNotIn("toastify-js", login_html)

        # Staff user sees latest_order_id, header badge, and Toastify/smart-polling assets
        self.client.force_login(self.staff_user)
        baseline_order = Order.objects.create(
            email="baseline@example.com",
            shipping_name="Baseline Client",
            shipping_address="1 Atelier Row",
            total=150,
        )

        dash_res = self.client.get(reverse("admin:index"))
        self.assertEqual(dash_res.status_code, 200)
        self.assertEqual(dash_res.context["latest_order_id"], baseline_order.id)
        self.assertEqual(dash_res.context["new_orders_to_process_count"], 1)
        html = dash_res.content.decode("utf-8")
        self.assertIn(f'data-latest-order-id="{baseline_order.id}"', html)
        self.assertIn('data-check-url="/api/check-new-orders/"', html)
        self.assertIn('id="resha-header-orders-pill"', html)
        self.assertIn('id="resha-header-orders-count">1<', html)
        self.assertIn('?queue=needs_processing', html)
        self.assertIn("toastify-js", html)
        self.assertIn("visibilitychange", html)

        # Sub-pages in admin also get live header notification badge & filter works
        changelist_res = self.client.get(
            f"{reverse('admin:orders_order_changelist')}?queue=needs_processing"
        )
        self.assertEqual(changelist_res.status_code, 200)
        changelist_html = changelist_res.content.decode("utf-8")
        self.assertIn('id="resha-header-orders-pill"', changelist_html)
        self.assertIn(baseline_order.order_number, changelist_html)

        # Validation on invalid last_id
        self.assertEqual(
            self.client.get("/api/check-new-orders/?last_id=invalid").status_code,
            400,
        )
        self.assertEqual(
            self.client.get("/api/check-new-orders/?last_id=-1").status_code,
            400,
        )

        # When no newer orders exist
        empty_res = self.client.get(
            f"/api/check-new-orders/?last_id={baseline_order.id}"
        )
        self.assertEqual(empty_res.status_code, 200)
        self.assertEqual(empty_res.json(), {"has_new": False})

        # Create 12 new orders -> first poll caps at 10 ordered by ascending id
        created_orders = [
            Order.objects.create(
                email=f"buyer{i}@example.com",
                shipping_name=f"Buyer {i}",
                shipping_address=f"{i} Mercer St",
                total=100 + i,
            )
            for i in range(1, 13)
        ]

        first_poll = self.client.get(
            f"/api/check-new-orders/?last_id={baseline_order.id}"
        )
        self.assertEqual(first_poll.status_code, 200)
        first_data = first_poll.json()
        self.assertTrue(first_data["has_new"])
        self.assertEqual(first_data["count"], 10)
        self.assertEqual(first_data["pending_process_count"], 13)
        self.assertEqual(first_data["awaiting_dispatch_count"], 13)
        self.assertEqual(first_data["latest_id"], created_orders[9].id)
        self.assertEqual(
            [row["id"] for row in first_data["orders"]],
            [o.id for o in created_orders[:10]],
        )
        sample = first_data["orders"][0]
        self.assertEqual(sample["order_number"], created_orders[0].order_number)
        self.assertEqual(sample["shipping_name"], "Buyer 1")
        self.assertEqual(sample["email"], "buyer1@example.com")
        self.assertEqual(sample["status"], "pending")
        self.assertEqual(sample["status_display"], "Pending")
        self.assertEqual(sample["total"], "101.00")
        self.assertEqual(
            sample["admin_url"],
            reverse("admin:orders_order_change", args=[created_orders[0].pk]),
        )
        self.assertTrue(sample["placed_at"])

        # Second poll picks up remaining 2 orders, third poll is empty
        second_poll = self.client.get(
            f"/api/check-new-orders/?last_id={first_data['latest_id']}"
        )
        self.assertEqual(second_poll.status_code, 200)
        second_data = second_poll.json()
        self.assertTrue(second_data["has_new"])
        self.assertEqual(second_data["count"], 2)
        self.assertEqual(second_data["latest_id"], created_orders[-1].id)

        third_poll = self.client.get(
            f"/api/check-new-orders/?last_id={second_data['latest_id']}"
        )
        self.assertEqual(third_poll.status_code, 200)
        self.assertEqual(third_poll.json(), {"has_new": False})

        # Processing an order removes it from the needs-processing header count & queue
        Order.objects.filter(pk=baseline_order.pk).update(status=OrderStatus.SHIPPED)
        after_ship_dash = self.client.get(reverse("admin:index"))
        self.assertEqual(after_ship_dash.context["new_orders_to_process_count"], 12)
        queue_after_ship = self.client.get(
            f"{reverse('admin:orders_order_changelist')}?queue=needs_processing"
        ).content.decode("utf-8")
        self.assertNotIn(baseline_order.order_number, queue_after_ship)
