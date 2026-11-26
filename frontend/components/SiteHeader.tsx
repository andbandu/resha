"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import {
  BagIcon,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
} from "./Icons";

const PRIMARY_NAV = [
  { label: "Shop All", href: "/shop" },
  { label: "Dresses", href: "/shop?category=Dresses" },
  { label: "Skirts", href: "/shop?category=Skirts" },
  { label: "Tops", href: "/shop?category=Tops" },
  { label: "Pants", href: "/shop?category=Pants" },
  { label: "Frocks", href: "/shop?category=Frocks" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, wishlist, openCart } = useCart();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isCheckout = pathname === "/checkout";

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    setSearchOpen(false);
    if (trimmed) {
      router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/shop");
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EEDDE2] bg-[#FFFFFF]/95 backdrop-blur-md">
      {/* Announcement Strip */}
      <div className="bg-[#0E0E10] px-4 py-2 text-center text-[11px] uppercase tracking-[0.2em] text-[#FFFFFF]">
        <span>
          Complimentary Express Shipping Over $120 · New Season Casualwear ·
          Code:{" "}
        </span>
        <span className="font-mono font-medium text-[#E8B4BE]">RESHA10</span>
      </div>

      {/* Main Nav Bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile toggle or Desktop 5-Category Nav */}
        <div className="flex items-center gap-5">
          {!isCheckout && (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-md p-1.5 text-[#0E0E10] lg:hidden hover:bg-[#FAF5F6]"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}

          {!isCheckout ? (
            <nav
              aria-label="Primary navigation"
              className="hidden lg:flex items-center gap-5"
            >
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10]/80 transition-colors hover:text-[#9E5E6A]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : (
            <Link
              href="/cart"
              className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#63636B] transition-colors hover:text-[#9E5E6A]"
            >
              ← Return to Bag
            </Link>
          )}
        </div>

        {/* Center Brand Wordmark */}
        <Link
          href="/"
          className="flex flex-col items-center group"
          aria-label="Resha Contemporary Womenswear Home"
        >
          <span className="font-serif text-2xl sm:text-[28px] font-normal tracking-[0.32em] text-[#0E0E10] transition-colors group-hover:text-[#9E5E6A]">
            RESHA
          </span>
          <span className="hidden sm:block text-[8px] font-medium uppercase tracking-[0.36em] text-[#9E5E6A] -mt-0.5">
            Contemporary Womenswear
          </span>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {!isCheckout && (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Toggle search"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-[#0E0E10] transition-colors hover:bg-[#FAF5F6] hover:text-[#9E5E6A]"
              >
                <SearchIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </button>

              <Link
                href="/shop?saved=1"
                aria-label={`Saved pieces (${wishlist.length})`}
                className="relative hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-[#0E0E10] transition-colors hover:bg-[#FAF5F6]"
              >
                <HeartIcon
                  className={`w-4 h-4 ${wishlist.length > 0 ? "text-[#9E5E6A]" : ""}`}
                  filled={wishlist.length > 0}
                />
                {wishlist.length > 0 && (
                  <span className="font-mono text-[11px] text-[#9E5E6A]">
                    {wishlist.length}
                  </span>
                )}
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open shopping bag with ${itemCount} items`}
            className="flex items-center gap-2 border border-[#0E0E10] bg-[#0E0E10] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:border-[#9E5E6A] hover:bg-[#9E5E6A]"
          >
            <BagIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bag</span>
            <span className="font-mono text-[11px] text-[#F2CFD6]">
              ({itemCount})
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && !isCheckout && (
        <div className="border-t border-[#EEDDE2] bg-[#FAF5F6] px-4 py-4 sm:px-6 lg:px-8">
          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto flex max-w-2xl items-center gap-3"
          >
            <SearchIcon className="w-4 h-4 text-[#9E5E6A]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dresses, skirts, tops, pants, frocks..."
              autoFocus
              className="flex-1 bg-transparent py-1.5 text-sm text-[#0E0E10] placeholder:text-[#63636B] focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#0E0E10] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="p-1.5 text-[#63636B] hover:text-[#0E0E10]"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="fixed inset-0 bg-[#0E0E10]/45 backdrop-blur-[2px]"
          />
          <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col bg-[#FFFFFF] border-r border-[#EEDDE2] p-6">
            <div className="flex items-center justify-between border-b border-[#EEDDE2] pb-4">
              <span className="font-serif text-2xl tracking-[0.3em] text-[#0E0E10]">
                RESHA
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-[#63636B] hover:text-[#0E0E10]"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-3">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-[#EEDDE2]/70 py-3 text-sm font-medium uppercase tracking-[0.14em] text-[#0E0E10] hover:text-[#9E5E6A]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-3 pt-6 border-t border-[#EEDDE2]">
              <Link
                href="/cart"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[#0E0E10]"
              >
                <span>Shopping Bag</span>
                <span className="font-mono text-[#9E5E6A]">({itemCount})</span>
              </Link>
              <Link
                href="/checkout"
                onClick={() => setMobileOpen(false)}
                className="block w-full bg-[#0E0E10] py-3.5 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#FFFFFF] hover:bg-[#9E5E6A]"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
