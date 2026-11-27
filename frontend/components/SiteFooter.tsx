"use client";

import React from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "./CartContext";
import NewsletterForm from "./NewsletterForm";

const FALLBACK_CATEGORY_NAMES = [
  "Dresses",
  "Skirts",
  "Tops",
  "Pants",
  "Frocks",
];

export default function SiteFooter() {
  const { storeConfig, categories } = useCart();

  const categoryNames =
    categories.length > 0
      ? categories.map((c) => c.name)
      : FALLBACK_CATEGORY_NAMES;

  return (
    <footer className="border-t border-[#EEDDE2] bg-[#0E0E10] text-[#FFFFFF]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <span className="font-serif text-3xl tracking-[0.32em] text-[#FFFFFF]">
                {storeConfig.storeName || "RESHA"}
              </span>
              <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#E8B4BE]">
                Modern Women&apos;s Casual Wear
              </p>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#B8B8C2]">
              Refined contemporary casual clothing for women across five core
              categories — effortless dresses, skirts, tops, pants, and day
              frocks tailored for modern poise.
            </p>
            <p className="font-mono text-xs text-[#8E8E98]">
              Worldwide Express Dispatch · Modern Women&apos;s Studio
            </p>
          </div>

          {/* Categories */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#E8B4BE]">
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm text-[#D8D8DF]">
              <li>
                <Link
                  href="/shop"
                  className="hover:text-[#E8B4BE] transition-colors"
                >
                  Shop All
                </Link>
              </li>
              {categoryNames.map((name) => (
                <li key={name}>
                  <Link
                    href={`/shop?category=${encodeURIComponent(name)}`}
                    className="hover:text-[#E8B4BE] transition-colors"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Client Care */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#E8B4BE]">
              Client Services
            </h3>
            <ul className="space-y-2.5 text-sm text-[#D8D8DF]">
              <li>
                <Link
                  href="/cart"
                  className="hover:text-[#E8B4BE] transition-colors"
                >
                  Shopping Bag
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="hover:text-[#E8B4BE] transition-colors"
                >
                  Express Checkout
                </Link>
              </li>
              <li>
                <Link
                  href="/product/amani-dress"
                  className="hover:text-[#E8B4BE] transition-colors"
                >
                  Amani Rose Pocket Dress
                </Link>
              </li>
              <li>
                <Link
                  href="/product/livia-dress"
                  className="hover:text-[#E8B4BE] transition-colors"
                >
                  Livia Blush Tiered Frock
                </Link>
              </li>
              <li>
                <Link
                  href="/product/lvy-skirt"
                  className="hover:text-[#E8B4BE] transition-colors"
                >
                  Lvy Dusty Rose Skirt
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#E8B4BE]">
              Private Client List
            </h3>
            <NewsletterForm />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-[#242429] pt-8 text-xs text-[#8E8E98] sm:flex-row sm:items-center">
          <p>© 2026 RESHA Contemporary Womenswear. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            <span>
              Complimentary Express Shipping Over{" "}
              {formatPrice(storeConfig.freeShippingThreshold)}
            </span>
            <span>30-Day Effortless Returns</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
