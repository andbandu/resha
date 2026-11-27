"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ApiRequestError,
  formatPrice,
  submitProductReview,
} from "@/lib/catalog";
import type { Product, ProductReview, SizeOption } from "@/lib/types";
import { useCart } from "./CartContext";
import ProductCard from "./ProductCard";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  RulerIcon,
  ShieldIcon,
  StarIcon,
} from "./Icons";

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
}

const SIZE_CHART_ROWS = [
  { size: "XS", chest: "32–34 in / 81–86 cm", waist: "25–27 in / 64–69 cm", hip: "35–37 in / 89–94 cm" },
  { size: "S", chest: "34–36 in / 86–91 cm", waist: "27–29 in / 69–74 cm", hip: "37–39 in / 94–99 cm" },
  { size: "M", chest: "36–38 in / 91–97 cm", waist: "29–31 in / 74–79 cm", hip: "39–41 in / 99–104 cm" },
  { size: "L", chest: "39–41 in / 99–104 cm", waist: "32–34 in / 81–86 cm", hip: "42–44 in / 107–112 cm" },
  { size: "XL", chest: "42–44 in / 107–112 cm", waist: "35–37 in / 89–94 cm", hip: "45–47 in / 114–119 cm" },
];

export default function ProductDetailView({
  product,
  relatedProducts,
}: ProductDetailViewProps) {
  const router = useRouter();
  const { addItem, toggleWishlist, isWishlisted, storeConfig } = useCart();

  const firstInStockSize =
    product.sizes.find((s) => s.inStock)?.size ?? product.sizes[0]?.size ?? "M";
  const hasAnyStock = product.sizes.some((s) => s.inStock);

  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<SizeOption>(firstInStockSize);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<
    "fabric" | "fit" | "care" | null
  >("fabric");

  const [reviews, setReviews] = useState<ProductReview[]>(product.reviews);
  const [reviewCount, setReviewCount] = useState(product.reviewCount);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    author: "",
    location: "",
    rating: 5,
    sizePurchased: firstInStockSize as SizeOption,
    fitFeedback: "True to Size" as "Runs Small" | "True to Size" | "Runs Large",
    comment: "",
  });

  const activeColor = product.colors[selectedColorIdx] ?? product.colors[0];
  const saved = isWishlisted(product.id);

  const baseGallery =
    product.images.length > 0
      ? product.images
      : activeColor?.image
      ? [{ src: activeColor.image, alt: product.name, caption: undefined }]
      : [];

  const galleryImages = baseGallery.map((img, i) =>
    i === 0 && activeColor?.image
      ? {
          ...img,
          src: activeColor.image,
          alt: `${product.name} in ${activeColor.name}`,
        }
      : img
  );
  const activeImage = galleryImages[activeImageIdx] ?? galleryImages[0];

  const selectedSizeStock = product.sizes.find((s) => s.size === selectedSize);

  function handleAddToBag() {
    if (!activeColor || !selectedSizeStock?.inStock) return;
    addItem(product, activeColor, selectedSize, quantity, true);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1800);
  }

  function handleBuyNow() {
    if (!activeColor || !selectedSizeStock?.inStock) return;
    addItem(product, activeColor, selectedSize, quantity, false);
    router.push("/checkout");
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewForm.author.trim() || !reviewForm.comment.trim()) {
      setReviewError("Please provide your name and review comment.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const created = await submitProductReview(product.slug, {
        author: reviewForm.author.trim(),
        location: reviewForm.location.trim(),
        rating: reviewForm.rating,
        sizePurchased: reviewForm.sizePurchased,
        fitFeedback: reviewForm.fitFeedback,
        comment: reviewForm.comment.trim(),
      });
      setReviews((prev) => [created, ...prev]);
      setReviewCount((c) => c + 1);
      setReviewSuccess(true);
      setReviewFormOpen(false);
      setReviewForm({
        author: "",
        location: "",
        rating: 5,
        sizePurchased: firstInStockSize,
        fitFeedback: "True to Size",
        comment: "",
      });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setReviewError(err.message);
      } else {
        setReviewError("Unable to submit review right now. Please try again.");
      }
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#63636B]"
      >
        <Link href="/" className="hover:text-[#9E5E6A]">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-[#9E5E6A]">
          Shop
        </Link>
        <span>/</span>
        <Link
          href={`/shop?category=${encodeURIComponent(product.category)}`}
          className="hover:text-[#9E5E6A]"
        >
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-[#0E0E10]">{product.name}</span>
      </nav>

      {/* Main Split Section */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left: Editorial Gallery */}
        <div className="space-y-4 lg:col-span-7">
          {activeImage ? (
            <button
              type="button"
              onClick={() => setZoomActive((z) => !z)}
              aria-label={zoomActive ? "Zoom out image" : "Zoom in on fabric detail"}
              className="group block w-full text-left cursor-zoom-in"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt}
                  fill
                  preload
                  quality={90}
                  sizes="(max-width: 1024px) 100vw, 720px"
                  className={`object-cover transition-transform duration-500 ${
                    zoomActive ? "scale-125 cursor-zoom-out" : "group-hover:scale-[1.02]"
                  }`}
                />
                {product.badge && (
                  <span className="absolute left-4 top-4 border border-[#EEDDE2] bg-[#FDF7F8]/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#7D4652]">
                    {product.badge}
                  </span>
                )}
                <span className="absolute bottom-4 right-4 bg-[#0E0E10]/75 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#FFFFFF] backdrop-blur-sm">
                  {zoomActive ? "Click to Reset" : "Click to Zoom"}
                </span>
              </div>
            </button>
          ) : (
            <div className="aspect-[3/4] w-full bg-[#F5F5F7]" />
          )}

          {activeImage?.caption && (
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#63636B]">
              {activeImage.caption}
            </p>
          )}

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {galleryImages.map((img, idx) => (
                <button
                  key={`${img.src}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveImageIdx(idx);
                    setZoomActive(false);
                  }}
                  aria-label={`View gallery image ${idx + 1}`}
                  className={`block w-full border transition-all ${
                    idx === activeImageIdx
                      ? "border-[#9E5E6A] ring-1 ring-[#9E5E6A]"
                      : "border-[#EEDDE2] opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 33vw, 160px"
                      className="object-cover"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sticky Product Configuration */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 space-y-6">
            {/* Meta & Rating */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#9E5E6A]">
                <span>{product.collection}</span>
                <span className="text-[#EEDDE2]">|</span>
                <span className="font-mono text-[#63636B]">{product.sku}</span>
              </div>

              <a
                href="#reviews"
                className="inline-flex items-center gap-1.5 text-xs text-[#0E0E10] hover:text-[#9E5E6A]"
              >
                <StarIcon className="w-3.5 h-3.5 text-[#9E5E6A]" />
                <span className="font-mono font-medium">{product.rating}</span>
                <span className="text-[#63636B]">
                  ({reviewCount} reviews)
                </span>
              </a>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-3xl font-light leading-tight tracking-[-0.025em] text-[#0E0E10] sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#63636B]">
                {product.subtitle}
              </p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 border-b border-[#EEDDE2] pb-5">
              <span className="font-mono text-2xl font-medium text-[#0E0E10]">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="font-mono text-base text-[#8E8E98] line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
              <span
                className={`ml-auto text-xs ${
                  hasAnyStock ? "text-[#1F5C42]" : "text-[#9F2D2D]"
                }`}
              >
                {hasAnyStock ? "In Stock · Ships in 24h" : "Currently Out of Stock"}
              </span>
            </div>

            {/* Color Selector */}
            {product.colors.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center justify-between text-xs">
                  <span className="uppercase tracking-[0.15em] text-[#63636B]">
                    Color
                  </span>
                  <span className="font-medium text-[#0E0E10]">
                    {activeColor?.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color, idx) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => {
                        setSelectedColorIdx(idx);
                        setActiveImageIdx(0);
                      }}
                      aria-label={`Select shade ${color.name}`}
                      className={`flex items-center gap-2 border px-3 py-2 text-xs transition-colors ${
                        idx === selectedColorIdx
                          ? "border-[#9E5E6A] bg-[#FAF5F6] text-[#0E0E10]"
                          : "border-[#EEDDE2] bg-[#FFFFFF] text-[#63636B] hover:border-[#9E5E6A]"
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-[#0E0E10]/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span>{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            <div>
              <div className="mb-2.5 flex items-center justify-between text-xs">
                <span className="uppercase tracking-[0.15em] text-[#63636B]">
                  Size
                </span>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0E0E10] underline decoration-[#E8B4BE] underline-offset-4 hover:text-[#9E5E6A]"
                >
                  <RulerIcon className="w-3.5 h-3.5 text-[#9E5E6A]" />
                  Size &amp; Fit Guide
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {product.sizes.map((s) => {
                  const active = selectedSize === s.size;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      disabled={!s.inStock}
                      onClick={() => setSelectedSize(s.size)}
                      className={`py-2.5 text-xs font-medium transition-colors ${
                        !s.inStock
                          ? "cursor-not-allowed border border-[#EEDDE2] bg-[#F5F5F7] text-[#B5B5BE] line-through"
                          : active
                          ? "border border-[#0E0E10] bg-[#0E0E10] text-[#FFFFFF]"
                          : "border border-[#EEDDE2] bg-[#FFFFFF] text-[#0E0E10] hover:border-[#9E5E6A]"
                      }`}
                    >
                      {s.size}
                    </button>
                  );
                })}
              </div>

              {selectedSizeStock &&
                selectedSizeStock.inStock &&
                selectedSizeStock.stockCount <= 4 && (
                  <p className="mt-2 text-xs text-[#9E5E6A]">
                    Limited stock: only {selectedSizeStock.stockCount} remaining
                    in size {selectedSizeStock.size}.
                  </p>
                )}
            </div>

            {/* Quantity & Action Buttons */}
            <div className="space-y-3 pt-1">
              <div className="flex gap-3">
                {/* Quantity */}
                <div className="inline-flex items-center border border-[#EEDDE2] bg-[#FFFFFF]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="px-3.5 py-3.5 text-[#63636B] hover:bg-[#FAF5F6] hover:text-[#0E0E10]"
                  >
                    <MinusIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="min-w-[2.25rem] text-center font-mono text-sm text-[#0E0E10]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(
                          Math.min(selectedSizeStock?.stockCount || 10, 10),
                          q + 1
                        )
                      )
                    }
                    aria-label="Increase quantity"
                    className="px-3.5 py-3.5 text-[#63636B] hover:bg-[#FAF5F6] hover:text-[#0E0E10]"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add to Bag */}
                <button
                  type="button"
                  disabled={!selectedSizeStock?.inStock}
                  onClick={handleAddToBag}
                  className="flex flex-1 items-center justify-center gap-2 bg-[#0E0E10] px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A] disabled:cursor-not-allowed disabled:bg-[#B5B5BE]"
                >
                  {addedFeedback ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Added to Bag
                    </>
                  ) : (
                    <>
                      Add to Bag · {formatPrice(product.price * quantity)}
                    </>
                  )}
                </button>

                {/* Wishlist */}
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label={saved ? "Remove from saved" : "Save garment"}
                  className="flex items-center justify-center border border-[#EEDDE2] bg-[#FFFFFF] px-3.5 text-[#0E0E10] transition-colors hover:border-[#9E5E6A]"
                >
                  <HeartIcon
                    className={`w-4 h-4 ${saved ? "text-[#9E5E6A]" : ""}`}
                    filled={saved}
                  />
                </button>
              </div>

              <button
                type="button"
                disabled={!selectedSizeStock?.inStock}
                onClick={handleBuyNow}
                className="flex w-full items-center justify-center gap-2 border border-[#0E0E10] bg-transparent py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#FAF5F6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Express Checkout
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed text-[#0E0E10]/85 pt-2">
              {product.description}
            </p>

            {/* Key Construction Details */}
            {product.details.length > 0 && (
              <ul className="space-y-1.5 border-y border-[#EEDDE2] py-4 text-xs text-[#63636B]">
                {product.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#9E5E6A]" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Accordions */}
            <div className="divide-y divide-[#EEDDE2] border-b border-[#EEDDE2]">
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setOpenAccordion((v) => (v === "fabric" ? null : "fabric"))
                  }
                  className="flex w-full items-center justify-between py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10]"
                >
                  <span>Fabric &amp; Craft</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-[#9E5E6A] transition-transform ${
                      openAccordion === "fabric" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion === "fabric" && (
                  <div className="space-y-1.5 pb-4 text-xs leading-relaxed text-[#63636B]">
                    <p>
                      <strong className="text-[#0E0E10]">Composition:</strong>{" "}
                      {product.fabric}
                    </p>
                    <p>
                      <strong className="text-[#0E0E10]">Weight:</strong>{" "}
                      {product.gsm}
                    </p>
                    <p>
                      <strong className="text-[#0E0E10]">Origin:</strong>{" "}
                      {product.origin}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setOpenAccordion((v) => (v === "fit" ? null : "fit"))
                  }
                  className="flex w-full items-center justify-between py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10]"
                >
                  <span>Fit &amp; Silhouette</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-[#9E5E6A] transition-transform ${
                      openAccordion === "fit" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion === "fit" && (
                  <p className="pb-4 text-xs leading-relaxed text-[#63636B]">
                    {product.fitNotes}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setOpenAccordion((v) => (v === "care" ? null : "care"))
                  }
                  className="flex w-full items-center justify-between py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10]"
                >
                  <span>Care &amp; Delivery</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-[#9E5E6A] transition-transform ${
                      openAccordion === "care" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion === "care" && (
                  <ul className="space-y-1.5 pb-4 text-xs text-[#63636B]">
                    {product.careInstructions.map((c) => (
                      <li key={c}>· {c}</li>
                    ))}
                    <li className="pt-1 text-[#1F5C42]">
                      · Complimentary express shipping over{" "}
                      {formatPrice(storeConfig.freeShippingThreshold)} · 30-day
                      effortless returns
                    </li>
                  </ul>
                )}
              </div>
            </div>

            {/* Trust note */}
            <div className="flex items-center gap-3 border border-[#EEDDE2] bg-[#FAF5F6] p-3.5 text-xs text-[#63636B]">
              <ShieldIcon className="w-4 h-4 shrink-0 text-[#9E5E6A]" />
              <span>
                Delivered in a signature reusable breathable garment sleeve.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section id="reviews" className="mt-20 border-t border-[#EEDDE2] pt-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9E5E6A]">
              Client Impressions
            </p>
            <h2 className="text-3xl font-light tracking-[-0.02em] text-[#0E0E10]">
              Worn &amp; Reviewed
            </h2>
            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-3xl font-medium text-[#0E0E10]">
                {product.rating}
              </span>
              <div>
                <div className="flex gap-0.5 text-[#9E5E6A]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} className="w-4 h-4" />
                  ))}
                </div>
                <p className="mt-0.5 text-xs text-[#63636B]">
                  Based on {reviewCount} verified clients
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setReviewFormOpen((v) => !v);
                  setReviewSuccess(false);
                }}
                className="border border-[#0E0E10] bg-[#FFFFFF] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#9E5E6A] hover:text-[#FFFFFF]"
              >
                {reviewFormOpen ? "Cancel Review" : "Write a Review"}
              </button>
            </div>

            {reviewSuccess && (
              <p className="text-xs text-[#1F5C42]">
                Thank you. Your review has been published.
              </p>
            )}
          </div>

          <div className="space-y-4 lg:col-span-8">
            {reviewFormOpen && (
              <form
                onSubmit={handleReviewSubmit}
                className="space-y-4 border border-[#9E5E6A] bg-[#FAF5F6] p-6"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9E5E6A]">
                  Share Your Fit &amp; Impression
                </p>

                {reviewError && (
                  <p className="text-xs text-[#9F2D2D]">{reviewError}</p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="rev-author"
                      className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                    >
                      Your Name *
                    </label>
                    <input
                      id="rev-author"
                      type="text"
                      required
                      value={reviewForm.author}
                      onChange={(e) =>
                        setReviewForm((f) => ({ ...f, author: e.target.value }))
                      }
                      placeholder="e.g. Maya R."
                      className="w-full border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="rev-location"
                      className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                    >
                      City
                    </label>
                    <input
                      id="rev-location"
                      type="text"
                      value={reviewForm.location}
                      onChange={(e) =>
                        setReviewForm((f) => ({
                          ...f,
                          location: e.target.value,
                        }))
                      }
                      placeholder="e.g. Colombo"
                      className="w-full border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="rev-rating"
                      className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                    >
                      Rating
                    </label>
                    <select
                      id="rev-rating"
                      value={reviewForm.rating}
                      onChange={(e) =>
                        setReviewForm((f) => ({
                          ...f,
                          rating: Number(e.target.value),
                        }))
                      }
                      className="w-full border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:outline-none"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} ★
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rev-size"
                      className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                    >
                      Size Purchased
                    </label>
                    <select
                      id="rev-size"
                      value={reviewForm.sizePurchased}
                      onChange={(e) =>
                        setReviewForm((f) => ({
                          ...f,
                          sizePurchased: e.target.value as SizeOption,
                        }))
                      }
                      className="w-full border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:outline-none"
                    >
                      {(["XS", "S", "M", "L", "XL"] as SizeOption[]).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rev-fit"
                      className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                    >
                      Fit Feedback
                    </label>
                    <select
                      id="rev-fit"
                      value={reviewForm.fitFeedback}
                      onChange={(e) =>
                        setReviewForm((f) => ({
                          ...f,
                          fitFeedback: e.target.value as
                            | "Runs Small"
                            | "True to Size"
                            | "Runs Large",
                        }))
                      }
                      className="w-full border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:outline-none"
                    >
                      <option value="True to Size">True to Size</option>
                      <option value="Runs Small">Runs Small</option>
                      <option value="Runs Large">Runs Large</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rev-comment"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#63636B]"
                  >
                    Review *
                  </label>
                  <textarea
                    id="rev-comment"
                    rows={3}
                    required
                    value={reviewForm.comment}
                    onChange={(e) =>
                      setReviewForm((f) => ({ ...f, comment: e.target.value }))
                    }
                    placeholder="Tell us about the fabric drape, sizing, and feel..."
                    className="w-full border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="bg-[#0E0E10] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A] disabled:opacity-60"
                >
                  {reviewSubmitting ? "Publishing..." : "Publish Review"}
                </button>
              </form>
            )}

            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="border border-[#EEDDE2] bg-[#FFFFFF] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[#0E0E10]">
                      {rev.author}
                    </span>
                    {rev.location && (
                      <span className="text-xs text-[#63636B]">
                        {rev.location}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-[#63636B]">
                    {rev.date}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#0E0E10]/90">
                  &ldquo;{rev.comment}&rdquo;
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.14em] text-[#63636B]">
                  <span>Size Purchased: {rev.sizePurchased}</span>
                  <span>·</span>
                  <span className="text-[#1F5C42]">Fit: {rev.fitFeedback}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 border-t border-[#EEDDE2] pt-14">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9E5E6A]">
                Complete the Look
              </p>
              <h2 className="mt-1.5 text-3xl font-light tracking-[-0.02em] text-[#0E0E10]">
                Pair Effortlessly With
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-xs font-medium uppercase tracking-[0.16em] text-[#0E0E10] underline decoration-[#E8B4BE] underline-offset-4 hover:text-[#9E5E6A]"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal */}
      {sizeGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Resha Size and Fit Guide"
        >
          <button
            type="button"
            onClick={() => setSizeGuideOpen(false)}
            aria-label="Close size guide"
            className="fixed inset-0 bg-[#0E0E10]/45 backdrop-blur-[2px]"
          />
          <div className="relative z-10 w-full max-w-xl border border-[#EEDDE2] bg-[#FFFFFF] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between border-b border-[#EEDDE2] pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E5E6A]">
                  Women&apos;s Measurements
                </p>
                <h3 className="mt-1 text-2xl font-light text-[#0E0E10]">
                  Size &amp; Fit Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                aria-label="Close modal"
                className="p-1.5 text-[#63636B] hover:text-[#0E0E10]"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-[#63636B]">
              {product.fitNotes}
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EEDDE2] text-[10px] uppercase tracking-[0.14em] text-[#9E5E6A]">
                    <th className="py-2.5 pr-3">Size</th>
                    <th className="py-2.5 pr-3">Bust</th>
                    <th className="py-2.5 pr-3">Waist</th>
                    <th className="py-2.5">Hip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEDDE2] font-mono text-[#0E0E10]">
                  {SIZE_CHART_ROWS.map((row) => (
                    <tr key={row.size}>
                      <td className="py-2.5 pr-3 font-sans font-medium">
                        {row.size}
                      </td>
                      <td className="py-2.5 pr-3">{row.chest}</td>
                      <td className="py-2.5 pr-3">{row.waist}</td>
                      <td className="py-2.5">{row.hip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
