"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "./CartContext";
import {
  ArrowRightIcon,
  BagIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "./Icons";

export default function CartDrawer() {
  const {
    items,
    itemCount,
    subtotal,
    discountAmount,
    storeConfig,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
  } = useCart();

  useEffect(() => {
    if (!isCartOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isCartOpen, closeCart]);

  if (!isCartOpen) return null;

  const threshold = storeConfig.freeShippingThreshold || 120;
  const remainingForFreeShipping = Math.max(0, threshold - subtotal);
  const shippingProgress = Math.min(
    100,
    Math.round((subtotal / threshold) * 100)
  );
  const estimatedTotal = Math.max(0, subtotal - discountAmount);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={closeCart}
        aria-label="Close shopping bag"
        className="fixed inset-0 bg-[#0E0E10]/45 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer panel */}
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FFFFFF] shadow-2xl border-l border-[#EEDDE2]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EEDDE2] px-6 py-5">
          <div className="flex items-center gap-2.5">
            <BagIcon className="w-5 h-5 text-[#9E5E6A]" />
            <h2 className="text-xl font-medium tracking-[-0.01em] text-[#0E0E10]">
              Shopping Bag
            </h2>
            <span className="ml-1 rounded-full bg-[#FAF5F6] px-2.5 py-0.5 font-mono text-xs text-[#9E5E6A]">
              {itemCount}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close bag"
            className="rounded-full p-2 text-[#63636B] transition-colors hover:bg-[#FAF5F6] hover:text-[#0E0E10]"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping progress bar */}
        <div className="border-b border-[#EEDDE2] bg-[#FAF5F6] px-6 py-3.5">
          <p className="text-xs text-[#0E0E10]">
            {remainingForFreeShipping === 0 ? (
              <span className="font-medium text-[#1F5C42]">
                Complimentary express shipping unlocked.
              </span>
            ) : (
              <>
                Add{" "}
                <span className="font-mono font-medium text-[#9E5E6A]">
                  {formatPrice(remainingForFreeShipping)}
                </span>{" "}
                more for complimentary express shipping.
              </>
            )}
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#EDD9DE]">
            <div
              className="h-full bg-[#9E5E6A] transition-all duration-500"
              style={{ width: `${shippingProgress}%` }}
            />
          </div>
        </div>

        {/* Line items */}
        <div className="resha-scroll flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#EEDDE2] bg-[#FAF5F6]">
                <BagIcon className="w-6 h-6 text-[#9E5E6A]" />
              </div>
              <p className="text-xl font-medium text-[#0E0E10]">
                Your bag is empty
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#63636B]">
                Explore modern dresses, skirts, tops, tailored pants, and chic
                day frocks.
              </p>
              <Link
                href="/shop"
                onClick={closeCart}
                className="mt-6 inline-flex items-center gap-2 bg-[#0E0E10] px-6 py-3 text-xs font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
              >
                Shop Collection
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#EEDDE2]">
              {items.map((item) => (
                <li key={item.key} className="flex gap-4 py-5">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="block h-28 w-22 shrink-0 overflow-hidden bg-[#F5F5F7]"
                  >
                    <div className="relative h-full w-full">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="88px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="text-base font-medium leading-snug text-[#0E0E10] hover:text-[#9E5E6A]"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.name}`}
                          className="p-1 text-[#63636B] transition-colors hover:text-[#9F2D2D]"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#63636B]">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full border border-[#0E0E10]/20"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <span>{item.colorName}</span>
                        <span>·</span>
                        <span>Size {item.size}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#EEDDE2] bg-[#FFFFFF]">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.key, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                          className="px-2.5 py-1.5 text-[#63636B] transition-colors hover:bg-[#FAF5F6] hover:text-[#0E0E10]"
                        >
                          <MinusIcon className="w-3 h-3" />
                        </button>
                        <span className="min-w-[2rem] text-center font-mono text-xs text-[#0E0E10]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.key, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                          className="px-2.5 py-1.5 text-[#63636B] transition-colors hover:bg-[#FAF5F6] hover:text-[#0E0E10]"
                        >
                          <PlusIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="font-mono text-sm font-medium text-[#0E0E10]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer summary */}
        {items.length > 0 && (
          <div className="border-t border-[#EEDDE2] bg-[#FFFFFF] px-6 py-5">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-[#63636B]">
                <span>Subtotal</span>
                <span className="font-mono text-[#0E0E10]">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-[#1F5C42]">
                  <span>Privilege Discount</span>
                  <span className="font-mono">
                    -{formatPrice(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#EEDDE2] pt-2 text-base font-medium text-[#0E0E10]">
                <span>Estimated Total</span>
                <span className="font-mono">{formatPrice(estimatedTotal)}</span>
              </div>
              <p className="text-[11px] text-[#63636B]">
                Taxes and shipping options confirmed at checkout.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/cart"
                onClick={closeCart}
                className="flex items-center justify-center border border-[#0E0E10] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.15em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#FAF5F6]"
              >
                View Bag
              </Link>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex items-center justify-center gap-2 bg-[#0E0E10] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.15em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
              >
                Checkout
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
