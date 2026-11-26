"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FREE_SHIPPING_THRESHOLD,
  PRODUCTS,
  formatPrice,
} from "@/lib/catalog";
import { useCart } from "./CartContext";
import ProductCard from "./ProductCard";
import {
  ArrowRightIcon,
  BagIcon,
  CheckIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  ShieldIcon,
  TrashIcon,
} from "./Icons";

export default function CartView() {
  const {
    items,
    itemCount,
    subtotal,
    appliedPromo,
    discountAmount,
    isHydrated,
    updateQuantity,
    removeItem,
    applyPromoCode,
    removePromoCode,
  } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const [promoFeedback, setPromoFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const recommended = useMemo(() => {
    const inCartIds = new Set(items.map((i) => i.productId));
    return PRODUCTS.filter((p) => !inCartIds.has(p.id)).slice(0, 4);
  }, [items]);

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="h-10 w-56 animate-pulse bg-[#EDD9DE]" />
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="h-64 animate-pulse bg-[#FAF5F6] lg:col-span-8" />
          <div className="h-64 animate-pulse bg-[#FAF5F6] lg:col-span-4" />
        </div>
      </div>
    );
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingCost =
    subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 18;
  const estimatedTax = Math.round(discountedSubtotal * 0.08);
  const orderTotal = discountedSubtotal + shippingCost + estimatedTax;
  const remainingFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const shippingPct = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );

  function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    const res = applyPromoCode(promoInput);
    setPromoFeedback(res);
    if (res.ok) setPromoInput("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Page Title */}
      <div className="border-b border-[#EEDDE2] pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
          Order Review
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-4xl font-light tracking-[-0.025em] text-[#0E0E10] sm:text-5xl">
            Shopping Bag
          </h1>
          <Link
            href="/shop"
            className="text-xs font-medium uppercase tracking-[0.15em] text-[#63636B] underline decoration-[#E8B4BE] underline-offset-4 hover:text-[#9E5E6A]"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="my-12 border border-[#EEDDE2] bg-[#FAF5F6] p-12 text-center sm:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#EEDDE2] bg-[#FFFFFF]">
            <BagIcon className="w-7 h-7 text-[#9E5E6A]" />
          </div>
          <h2 className="text-3xl font-light text-[#0E0E10]">
            Your shopping bag is empty
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#63636B]">
            Explore modern women&apos;s dresses, skirts, tops, tailored pants,
            and contemporary day frocks.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-flex items-center gap-2 bg-[#0E0E10] px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
          >
            Shop Collection
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left: Line Items */}
          <div className="space-y-6 lg:col-span-8">
            {/* Free shipping progress */}
            <div className="border border-[#EEDDE2] bg-[#FAF5F6] p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs">
                <span>
                  {remainingFree === 0 ? (
                    <span className="font-medium text-[#1F5C42]">
                      You&apos;ve unlocked complimentary worldwide express
                      shipping.
                    </span>
                  ) : (
                    <>
                      Add{" "}
                      <span className="font-mono font-medium text-[#9E5E6A]">
                        {formatPrice(remainingFree)}
                      </span>{" "}
                      more for complimentary express shipping.
                    </>
                  )}
                </span>
                <span className="font-mono text-[#9E5E6A]">{shippingPct}%</span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EDD9DE]">
                <div
                  className="h-full bg-[#9E5E6A] transition-all duration-500"
                  style={{ width: `${shippingPct}%` }}
                />
              </div>
            </div>

            {/* Table/List of items */}
            <div className="divide-y divide-[#EEDDE2] border border-[#EEDDE2] bg-[#FFFFFF]">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    className="block w-24 shrink-0 sm:w-28"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 96px, 112px"
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9E5E6A]">
                        {item.sku}
                      </p>
                      <Link
                        href={`/product/${item.slug}`}
                        className="block text-xl font-medium tracking-[-0.01em] text-[#0E0E10] hover:text-[#9E5E6A]"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-[#63636B]">{item.fabric}</p>
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#0E0E10]">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full border border-[#0E0E10]/20"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          {item.colorName}
                        </span>
                        <span className="text-[#EEDDE2]">|</span>
                        <span>Size {item.size}</span>
                        <span className="text-[#EEDDE2]">|</span>
                        <span className="font-mono text-[#63636B]">
                          {formatPrice(item.price)} each
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end">
                      <p className="font-mono text-base font-medium text-[#0E0E10]">
                        {formatPrice(item.price * item.quantity)}
                      </p>

                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center border border-[#EEDDE2] bg-[#FFFFFF]">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.key, item.quantity - 1)
                            }
                            aria-label="Decrease quantity"
                            className="px-2.5 py-2 text-[#63636B] hover:bg-[#FAF5F6] hover:text-[#0E0E10]"
                          >
                            <MinusIcon className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-[2.25rem] text-center font-mono text-xs text-[#0E0E10]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.key, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                            className="px-2.5 py-2 text-[#63636B] hover:bg-[#FAF5F6] hover:text-[#0E0E10]"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.name}`}
                          className="p-2 text-[#63636B] transition-colors hover:text-[#9F2D2D]"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Summary & Promo Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6 border border-[#EEDDE2] bg-[#FFFFFF] p-6 sm:p-8">
              <h2 className="text-2xl font-light tracking-[-0.015em] text-[#0E0E10]">
                Order Summary
              </h2>

              {/* Promo Code Form */}
              <div className="space-y-2.5 border-y border-[#EEDDE2] py-5">
                <label
                  htmlFor="promo-code"
                  className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#9E5E6A]"
                >
                  Privilege Code
                </label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between border border-[#1F5C42]/30 bg-[#1F5C42]/5 px-3 py-2.5 text-xs text-[#1F5C42]">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>
                        <strong className="font-mono">{appliedPromo.code}</strong>{" "}
                        — {appliedPromo.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removePromoCode();
                        setPromoFeedback(null);
                      }}
                      aria-label="Remove promo code"
                      className="p-1 hover:text-[#0E0E10]"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      id="promo-code"
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="e.g. RESHA10"
                      className="w-full border border-[#EEDDE2] bg-[#FAF5F6] px-3 py-2 font-mono text-xs uppercase text-[#0E0E10] placeholder:normal-case placeholder:font-sans placeholder:text-[#63636B] focus:border-[#9E5E6A] focus:bg-[#FFFFFF] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="border border-[#0E0E10] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#9E5E6A] hover:text-[#FFFFFF]"
                    >
                      Apply
                    </button>
                  </form>
                )}

                {promoFeedback && !appliedPromo && (
                  <p
                    className={`text-xs ${
                      promoFeedback.ok ? "text-[#1F5C42]" : "text-[#9F2D2D]"
                    }`}
                  >
                    {promoFeedback.message}
                  </p>
                )}

                {!appliedPromo && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#63636B]">
                    <span>Available:</span>
                    {["RESHA10", "CASUAL20"].map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          const res = applyPromoCode(code);
                          setPromoFeedback(res);
                        }}
                        className="border border-[#EEDDE2] bg-[#FAF5F6] px-2 py-0.5 font-mono text-[10px] text-[#7D4652] hover:border-[#9E5E6A]"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#63636B]">
                  <span>
                    Subtotal ({itemCount} {itemCount === 1 ? "piece" : "pieces"})
                  </span>
                  <span className="font-mono text-[#0E0E10]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#1F5C42]">
                    <span>Privilege Discount</span>
                    <span className="font-mono">
                      -{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#63636B]">
                  <span>Estimated Shipping</span>
                  <span className="font-mono text-[#0E0E10]">
                    {shippingCost === 0
                      ? "Complimentary"
                      : formatPrice(shippingCost)}
                  </span>
                </div>

                <div className="flex justify-between text-[#63636B]">
                  <span>Estimated Tax (8%)</span>
                  <span className="font-mono text-[#0E0E10]">
                    {formatPrice(estimatedTax)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#EEDDE2] pt-3 text-base font-medium text-[#0E0E10]">
                  <span>Estimated Total</span>
                  <span className="font-mono text-lg">
                    {formatPrice(orderTotal)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="flex w-full items-center justify-center gap-2 bg-[#0E0E10] py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
              >
                Proceed to Checkout
                <ArrowRightIcon className="w-4 h-4" />
              </Link>

              <div className="flex items-start gap-2.5 border border-[#EEDDE2] bg-[#FAF5F6] p-3 text-[11px] leading-relaxed text-[#63636B]">
                <ShieldIcon className="mt-0.5 w-4 h-4 shrink-0 text-[#9E5E6A]" />
                <span>
                  Complimentary 30-day exchanges &amp; signature garment sleeve
                  included with every dispatch.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Sell Recommendations */}
      {recommended.length > 0 && (
        <section className="mt-20 border-t border-[#EEDDE2] pt-14">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9E5E6A]">
                Complete the Edit
              </p>
              <h2 className="mt-1.5 text-3xl font-light tracking-[-0.02em] text-[#0E0E10]">
                Curated Additions
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-xs font-medium uppercase tracking-[0.16em] text-[#0E0E10] underline decoration-[#E8B4BE] underline-offset-4 hover:text-[#9E5E6A]"
            >
              Shop All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
