"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FREE_SHIPPING_THRESHOLD, formatPrice } from "@/lib/catalog";
import type { OrderRecord } from "@/lib/types";
import { useCart } from "./CartContext";
import { ArrowRightIcon, BagIcon, CheckIcon, ShieldIcon } from "./Icons";

type DeliveryMethod = "standard" | "express" | "studio";
type PaymentMethod = "card" | "cod";

interface FormState {
  email: string;
  newsletter: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  deliveryMethod: DeliveryMethod;
  giftWrap: boolean;
  giftNote: string;
  paymentMethod: PaymentMethod;
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
}

const INITIAL_FORM: FormState = {
  email: "",
  newsletter: true,
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
  deliveryMethod: "standard",
  giftWrap: false,
  giftNote: "",
  paymentMethod: "card",
  cardName: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvc: "",
};

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

function createOrderMetadata() {
  const suffix = String((Date.now() % 9000) + 1000);
  const placedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  return {
    orderNumber: `RSH-2026-${suffix}`,
    placedAt,
  };
}

export default function CheckoutView() {
  const {
    items,
    subtotal,
    appliedPromo,
    discountAmount,
    isHydrated,
    clearCart,
  } = useCart();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(
    null
  );

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="h-10 w-56 animate-pulse bg-[#EDD9DE]" />
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="h-96 animate-pulse bg-[#FAF5F6] lg:col-span-7" />
          <div className="h-80 animate-pulse bg-[#FAF5F6] lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="border border-[#EEDDE2] bg-[#FFFFFF] p-8 sm:p-12">
          <div className="flex items-center gap-3 text-[#1F5C42]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F5C42]/10">
              <CheckIcon className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em]">
                Order Confirmed
              </p>
              <p className="font-mono text-sm text-[#0E0E10]">
                {confirmedOrder.orderNumber}
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-light tracking-[-0.02em] text-[#0E0E10]">
            Thank you, {confirmedOrder.shippingName.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#63636B]">
            Your order is being prepared for dispatch. A confirmation summary
            has been prepared for{" "}
            <span className="font-medium text-[#0E0E10]">
              {confirmedOrder.email}
            </span>
            .
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 border-y border-[#EEDDE2] py-6 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9E5E6A]">
                Shipping Destination
              </p>
              <p className="mt-1.5 font-medium text-[#0E0E10]">
                {confirmedOrder.shippingName}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#63636B]">
                {confirmedOrder.shippingAddress}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9E5E6A]">
                Delivery Method
              </p>
              <p className="mt-1.5 font-medium text-[#0E0E10]">
                {confirmedOrder.shippingMethodLabel}
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#63636B]">
                Placed {confirmedOrder.placedAt}
              </p>
              {confirmedOrder.giftWrap && (
                <p className="mt-1 text-xs text-[#9E5E6A]">
                  Includes signature gift wrapping &amp; card
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9E5E6A]">
              Pieces Ordered
            </p>
            <ul className="divide-y divide-[#EEDDE2]">
              {confirmedOrder.items.map((item) => (
                <li key={item.key} className="flex items-center gap-4 py-3.5">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[#F5F5F7]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-[#0E0E10]">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#63636B]">
                      {item.colorName} · Size {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-[#0E0E10]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 space-y-2 border-t border-[#EEDDE2] pt-5 text-sm">
            <div className="flex justify-between text-[#63636B]">
              <span>Subtotal</span>
              <span className="font-mono">
                {formatPrice(confirmedOrder.subtotal)}
              </span>
            </div>
            {confirmedOrder.discount > 0 && (
              <div className="flex justify-between text-[#1F5C42]">
                <span>Privilege Credit</span>
                <span className="font-mono">
                  -{formatPrice(confirmedOrder.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#63636B]">
              <span>Shipping</span>
              <span className="font-mono">
                {confirmedOrder.shippingCost === 0
                  ? "Complimentary"
                  : formatPrice(confirmedOrder.shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-[#63636B]">
              <span>Tax</span>
              <span className="font-mono">
                {formatPrice(confirmedOrder.tax)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#EEDDE2] pt-3 text-base font-medium text-[#0E0E10]">
              <span>Total Paid</span>
              <span className="font-mono text-lg">
                {formatPrice(confirmedOrder.total)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#0E0E10] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
            >
              Continue Shopping
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center border border-[#0E0E10] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#FAF5F6]"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#EEDDE2] bg-[#FAF5F6]">
          <BagIcon className="w-7 h-7 text-[#9E5E6A]" />
        </div>
        <h1 className="text-4xl font-light text-[#0E0E10]">
          Your Bag is Empty
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#63636B]">
          Select pieces from our collection before proceeding to checkout.
        </p>
        <div className="mt-7 flex justify-center gap-4">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[#0E0E10] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] hover:bg-[#9E5E6A]"
          >
            Shop Collection
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const standardShipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 18;
  const deliveryCostMap: Record<DeliveryMethod, number> = {
    standard: standardShipping,
    express: 32,
    studio: 0,
  };
  const deliveryLabelMap: Record<DeliveryMethod, string> = {
    standard: "Standard Tracked Dispatch (4–6 Business Days)",
    express: "Express Air Courier (2–3 Business Days)",
    studio: "Studio Pickup (Ready in 4 Hours)",
  };

  const shippingCost = deliveryCostMap[form.deliveryMethod];
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(discountedSubtotal * 0.08);
  const total = discountedSubtotal + shippingCost + tax;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address for order updates.";
    }
    if (!form.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (form.phone.replace(/\D/g, "").length < 7) {
      nextErrors.phone = "Enter a valid contact phone number.";
    }
    if (!form.address.trim()) nextErrors.address = "Street address is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!form.postalCode.trim()) {
      nextErrors.postalCode = "Postal / ZIP code is required.";
    }

    if (form.paymentMethod === "card") {
      if (!form.cardName.trim()) {
        nextErrors.cardName = "Name on card is required.";
      }
      if (form.cardNumber.replace(/\s/g, "").length < 13) {
        nextErrors.cardNumber = "Enter a valid 13–16 digit card number.";
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.cardExpiry.trim())) {
        nextErrors.cardExpiry = "Use MM/YY format.";
      }
      if (!/^\d{3,4}$/.test(form.cardCvc.trim())) {
        nextErrors.cardCvc = "Enter 3 or 4 digits.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const snapshotItems = [...items];
    const { orderNumber: orderCode, placedAt: nowLabel } =
      createOrderMetadata();

    const fullAddress = [
      form.address.trim(),
      form.apartment.trim(),
      `${form.city.trim()}${form.state.trim() ? `, ${form.state.trim()}` : ""} ${form.postalCode.trim()}`,
      form.country,
    ]
      .filter(Boolean)
      .join(", ");

    const record: OrderRecord = {
      orderNumber: orderCode,
      placedAt: nowLabel,
      email: form.email.trim(),
      shippingName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      shippingAddress: fullAddress,
      shippingMethodLabel: deliveryLabelMap[form.deliveryMethod],
      shippingCost,
      subtotal,
      discount: discountAmount,
      tax,
      total,
      giftWrap: form.giftWrap,
      giftNote: form.giftNote.trim() || undefined,
      items: snapshotItems,
    };

    window.setTimeout(() => {
      setConfirmedOrder(record);
      clearCart();
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 350);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#EEDDE2] pb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
            Secure Checkout
          </p>
          <h1 className="mt-2 text-4xl font-light tracking-[-0.025em] text-[#0E0E10] sm:text-5xl">
            Complete Your Order
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#63636B]">
          <ShieldIcon className="w-4 h-4 text-[#9E5E6A]" />
          <span>Encrypted Order Dispatch</span>
        </div>
      </div>

      <form
        onSubmit={handlePlaceOrder}
        noValidate
        className="grid grid-cols-1 gap-10 lg:grid-cols-12"
      >
        {/* Left: Structured Form */}
        <div className="space-y-10 lg:col-span-7">
          {/* 1. Contact */}
          <section className="space-y-4 border border-[#EEDDE2] bg-[#FFFFFF] p-6 sm:p-8">
            <h2 className="text-xl font-medium text-[#0E0E10]">
              01 · Contact Information
            </h2>
            <div>
              <label
                htmlFor="checkout-email"
                className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
              >
                Email Address *
              </label>
              <input
                id="checkout-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-[#9F2D2D]">{errors.email}</p>
              )}
            </div>
            <label className="flex items-center gap-2.5 text-xs text-[#63636B]">
              <input
                type="checkbox"
                checked={form.newsletter}
                onChange={(e) => updateField("newsletter", e.target.checked)}
                className="accent-[#9E5E6A]"
              />
              <span>
                Receive new arrival previews and shipment tracking updates
              </span>
            </label>
          </section>

          {/* 2. Shipping Address */}
          <section className="space-y-4 border border-[#EEDDE2] bg-[#FFFFFF] p-6 sm:p-8">
            <h2 className="text-xl font-medium text-[#0E0E10]">
              02 · Shipping Destination
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                >
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-[#9F2D2D]">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                >
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-[#9F2D2D]">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="country"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                >
                  Country / Region
                </label>
                <select
                  id="country"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                >
                  <option value="United States">United States</option>
                  <option value="India">India</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="France">France</option>
                  <option value="Germany">Germany</option>
                  <option value="Australia">Australia</option>
                  <option value="Singapore">Singapore</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                >
                  Phone (For Courier) *
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-[#9F2D2D]">{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
              >
                Street Address *
              </label>
              <input
                id="address"
                type="text"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Street, building, or house number"
                className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
              />
              {errors.address && (
                <p className="mt-1 text-xs text-[#9F2D2D]">{errors.address}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="apartment"
                className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
              >
                Apartment, Suite, Floor (Optional)
              </label>
              <input
                id="apartment"
                type="text"
                value={form.apartment}
                onChange={(e) => updateField("apartment", e.target.value)}
                className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="city"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                >
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-[#9F2D2D]">{errors.city}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                >
                  State / Region
                </label>
                <input
                  id="state"
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="postalCode"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                >
                  Postal Code *
                </label>
                <input
                  id="postalCode"
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 font-mono text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-xs text-[#9F2D2D]">
                    {errors.postalCode}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 3. Delivery Method */}
          <section className="space-y-4 border border-[#EEDDE2] bg-[#FFFFFF] p-6 sm:p-8">
            <h2 className="text-xl font-medium text-[#0E0E10]">
              03 · Delivery Method
            </h2>
            <div className="space-y-3">
              {(
                [
                  {
                    id: "standard",
                    title: "Standard Tracked Dispatch",
                    eta: "4–6 business days · Tracked",
                    price: standardShipping,
                  },
                  {
                    id: "express",
                    title: "Express Air Courier",
                    eta: "2–3 business days · Priority customs",
                    price: 32,
                  },
                  {
                    id: "studio",
                    title: "Studio Pickup",
                    eta: "Ready within 4 hours",
                    price: 0,
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between border p-4 transition-colors ${
                    form.deliveryMethod === option.id
                      ? "border-[#9E5E6A] bg-[#FAF5F6]"
                      : "border-[#EEDDE2] hover:border-[#9E5E6A]/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={form.deliveryMethod === option.id}
                      onChange={() => updateField("deliveryMethod", option.id)}
                      className="mt-1 accent-[#9E5E6A]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#0E0E10]">
                        {option.title}
                      </p>
                      <p className="text-xs text-[#63636B]">{option.eta}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-[#0E0E10]">
                    {option.price === 0
                      ? "Complimentary"
                      : formatPrice(option.price)}
                  </span>
                </label>
              ))}
            </div>

            <div className="border-t border-[#EEDDE2] pt-4 space-y-3">
              <label className="flex items-center gap-2.5 text-xs text-[#0E0E10]">
                <input
                  type="checkbox"
                  checked={form.giftWrap}
                  onChange={(e) => updateField("giftWrap", e.target.checked)}
                  className="accent-[#9E5E6A]"
                />
                <span>
                  Include complimentary signature gift box &amp; personal message
                  card
                </span>
              </label>
              {form.giftWrap && (
                <textarea
                  rows={2}
                  value={form.giftNote}
                  onChange={(e) => updateField("giftNote", e.target.value)}
                  placeholder="Write an optional gift message..."
                  className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                />
              )}
            </div>
          </section>

          {/* 4. Payment */}
          <section className="space-y-4 border border-[#EEDDE2] bg-[#FFFFFF] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-medium text-[#0E0E10]">
                04 · Payment Details
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9E5E6A]">
                Frontend Demo Checkout
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField("paymentMethod", "card")}
                className={`border py-3 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  form.paymentMethod === "card"
                    ? "border-[#0E0E10] bg-[#0E0E10] text-[#FFFFFF]"
                    : "border-[#EEDDE2] bg-[#FAF5F6] text-[#0E0E10]"
                }`}
              >
                Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => updateField("paymentMethod", "cod")}
                className={`border py-3 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  form.paymentMethod === "cod"
                    ? "border-[#0E0E10] bg-[#0E0E10] text-[#FFFFFF]"
                    : "border-[#EEDDE2] bg-[#FAF5F6] text-[#0E0E10]"
                }`}
              >
                Pay on Delivery
              </button>
            </div>

            {form.paymentMethod === "card" ? (
              <div className="space-y-4 pt-2">
                <div>
                  <label
                    htmlFor="cardName"
                    className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                  >
                    Name on Card *
                  </label>
                  <input
                    id="cardName"
                    type="text"
                    value={form.cardName}
                    onChange={(e) => updateField("cardName", e.target.value)}
                    placeholder="Full name as printed on card"
                    className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                  {errors.cardName && (
                    <p className="mt-1 text-xs text-[#9F2D2D]">
                      {errors.cardName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="cardNumber"
                    className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                  >
                    Card Number *
                  </label>
                  <input
                    id="cardNumber"
                    type="text"
                    inputMode="numeric"
                    value={form.cardNumber}
                    onChange={(e) =>
                      updateField("cardNumber", formatCardNumber(e.target.value))
                    }
                    placeholder="4242 4242 4242 4242"
                    className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 font-mono text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                  {errors.cardNumber && (
                    <p className="mt-1 text-xs text-[#9F2D2D]">
                      {errors.cardNumber}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="cardExpiry"
                      className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                    >
                      Expiration (MM/YY) *
                    </label>
                    <input
                      id="cardExpiry"
                      type="text"
                      inputMode="numeric"
                      value={form.cardExpiry}
                      onChange={(e) =>
                        updateField("cardExpiry", formatExpiry(e.target.value))
                      }
                      placeholder="09/29"
                      className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 font-mono text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                    />
                    {errors.cardExpiry && (
                      <p className="mt-1 text-xs text-[#9F2D2D]">
                        {errors.cardExpiry}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="cardCvc"
                      className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                    >
                      Security Code *
                    </label>
                    <input
                      id="cardCvc"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={form.cardCvc}
                      onChange={(e) =>
                        updateField(
                          "cardCvc",
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      placeholder="424"
                      className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3.5 py-2.5 font-mono text-sm text-[#0E0E10] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                    />
                    {errors.cardCvc && (
                      <p className="mt-1 text-xs text-[#9F2D2D]">
                        {errors.cardCvc}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="bg-[#FAF5F6] p-4 text-xs leading-relaxed text-[#63636B]">
                Settle via cash or contactless terminal directly with our
                courier upon delivery. No advance online charge will be made.
              </p>
            )}
          </section>
        </div>

        {/* Right: Sticky Summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 space-y-6 border border-[#EEDDE2] bg-[#FFFFFF] p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-[#EEDDE2] pb-4">
              <h2 className="text-2xl font-light text-[#0E0E10]">
                Order Summary
              </h2>
              <Link
                href="/cart"
                className="text-xs uppercase tracking-[0.14em] text-[#9E5E6A] underline underline-offset-4 hover:text-[#0E0E10]"
              >
                Edit Bag
              </Link>
            </div>

            <ul className="max-h-80 divide-y divide-[#EEDDE2] overflow-y-auto resha-scroll pr-1">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-4 py-3.5">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[#F5F5F7]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                    <span className="absolute right-0 top-0 bg-[#9E5E6A] px-1.5 py-0.5 font-mono text-[10px] text-[#FFFFFF]">
                      ×{item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-base font-medium text-[#0E0E10]">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#63636B]">
                      {item.colorName} · Size {item.size}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-[#0E0E10]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="space-y-2.5 border-t border-[#EEDDE2] pt-5 text-sm">
              <div className="flex justify-between text-[#63636B]">
                <span>Subtotal</span>
                <span className="font-mono text-[#0E0E10]">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && appliedPromo && (
                <div className="flex justify-between text-[#1F5C42]">
                  <span>Privilege ({appliedPromo.code})</span>
                  <span className="font-mono">
                    -{formatPrice(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#63636B]">
                <span>Shipping</span>
                <span className="font-mono text-[#0E0E10]">
                  {shippingCost === 0
                    ? "Complimentary"
                    : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-[#63636B]">
                <span>Estimated Tax (8%)</span>
                <span className="font-mono text-[#0E0E10]">
                  {formatPrice(tax)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#EEDDE2] pt-3 text-base font-medium text-[#0E0E10]">
                <span>Total Due</span>
                <span className="font-mono text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 bg-[#0E0E10] py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A] disabled:opacity-60"
            >
              {isSubmitting
                ? "Confirming Order..."
                : `Complete Order · ${formatPrice(total)}`}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-[#63636B]">
              By completing your order you agree to RESHA&apos;s 30-day easy
              returns &amp; garment care terms.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
