"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/catalog";
import type { Product, SizeOption } from "@/lib/types";
import { useCart } from "./CartContext";
import { CheckIcon, HeartIcon } from "./Icons";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, toggleWishlist, isWishlisted } = useCart();
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [justAddedSize, setJustAddedSize] = useState<SizeOption | null>(null);

  const activeColor = product.colors[selectedColorIdx] ?? product.colors[0];
  const displayImage = activeColor?.image || product.images[0]?.src || "";
  const saved = isWishlisted(product.id);

  function handleQuickAdd(e: React.MouseEvent, size: SizeOption) {
    e.preventDefault();
    e.stopPropagation();
    const colorToAdd = activeColor ?? {
      name: "Studio Shade",
      hex: "#0E0E10",
      image: displayImage,
    };
    addItem(product, colorToAdd, size, 1, true);
    setJustAddedSize(size);
    window.setTimeout(() => setJustAddedSize(null), 1400);
  }

  return (
    <article className="group flex flex-col">
      {/* Image Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
        <Link
          href={`/product/${product.slug}`}
          className="relative block h-full w-full"
          aria-label={product.name}
        >
          {displayImage && (
            <Image
              src={displayImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          )}
        </Link>

        {/* Top-left modern rose-tinted badge */}
        {product.badge && (
          <span className="pointer-events-none absolute left-3 top-3 border border-[#EEDDE2] bg-[#FDF7F8]/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#7D4652]">
            {product.badge}
          </span>
        )}

        {/* Top-right Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          aria-label={
            saved
              ? `Remove ${product.name} from saved`
              : `Save ${product.name}`
          }
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFFFF]/90 text-[#0E0E10] backdrop-blur-sm transition-all hover:bg-[#FFFFFF] hover:scale-105"
        >
          <HeartIcon
            className={`w-4 h-4 ${saved ? "text-[#9E5E6A]" : "text-[#0E0E10]"}`}
            filled={saved}
          />
        </button>

        {/* Desktop Quick Add Size Bar on Hover */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 hidden sm:block">
          <div className="border border-[#EEDDE2] bg-[#FFFFFF]/95 p-2.5 shadow-lg backdrop-blur-md">
            <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-[#9E5E6A]">
              {justAddedSize ? "Added to Bag" : "Quick Add Size"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {product.sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  disabled={!s.inStock}
                  onClick={(e) => handleQuickAdd(e, s.size)}
                  className={`min-w-[2rem] px-2 py-1 text-[11px] font-medium transition-colors ${
                    !s.inStock
                      ? "cursor-not-allowed text-[#B5B5BE] line-through"
                      : justAddedSize === s.size
                      ? "bg-[#9E5E6A] text-[#FFFFFF]"
                      : "bg-[#FAF5F6] text-[#0E0E10] hover:bg-[#0E0E10] hover:text-[#FFFFFF]"
                  }`}
                >
                  {justAddedSize === s.size ? (
                    <CheckIcon className="mx-auto w-3 h-3" />
                  ) : (
                    s.size
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-3.5 flex flex-1 flex-col justify-between space-y-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#9E5E6A]">
              {product.category}
            </p>
            <span className="font-mono text-[10px] text-[#8E8E98]">
              {product.fabricFamily}
            </span>
          </div>
          <Link
            href={`/product/${product.slug}`}
            className="mt-1 block text-base font-medium leading-snug tracking-[-0.01em] text-[#0E0E10] transition-colors hover:text-[#9E5E6A]"
          >
            {product.name}
          </Link>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-2 font-mono text-sm">
            <span className="font-medium text-[#0E0E10]">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-xs text-[#8E8E98] line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Color Swatches */}
          <div className="flex items-center gap-1.5">
            {product.colors.map((color, idx) => (
              <button
                key={color.name}
                type="button"
                onClick={() => setSelectedColorIdx(idx)}
                title={color.name}
                aria-label={`Select color ${color.name}`}
                className={`h-3.5 w-3.5 rounded-full border transition-transform ${
                  idx === selectedColorIdx
                    ? "scale-110 border-[#9E5E6A] ring-1 ring-[#9E5E6A] ring-offset-1 ring-offset-[#FFFFFF]"
                    : "border-[#0E0E10]/20 hover:scale-110"
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
