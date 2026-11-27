"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Product, SizeOption } from "@/lib/types";
import { useCart } from "./CartContext";
import ProductCard from "./ProductCard";
import { CloseIcon, FilterIcon, SearchIcon } from "./Icons";

const ALL_CATEGORIES: ("All" | Category)[] = [
  "All",
  "Dresses",
  "Skirts",
  "Tops",
  "Pants",
  "Frocks",
];

const FABRIC_FILTERS: Product["fabricFamily"][] = [
  "Soft Mulberry Silk",
  "Breathable Linen",
  "Combed Cotton",
  "Soft Rib Knit",
];

const SIZE_FILTERS: SizeOption[] = ["XS", "S", "M", "L", "XL"];

type SortMode = "featured" | "price-asc" | "price-desc" | "newest" | "rating";

function normalizeCategoryParam(raw: string | null): "All" | Category {
  if (!raw) return "All";
  const lower = raw.trim().toLowerCase();
  if (lower === "dress" || lower === "dresses") return "Dresses";
  if (lower === "skirt" || lower === "skirts") return "Skirts";
  if (lower === "top" || lower === "tops") return "Tops";
  if (lower === "pant" || lower === "pants") return "Pants";
  if (lower === "frock" || lower === "frocks") return "Frocks";
  return "All";
}

export default function ShopCatalog({ products }: { products: Product[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wishlist } = useCart();

  const categoryParam = normalizeCategoryParam(searchParams.get("category"));
  const collectionParam = searchParams.get("collection") || "";
  const queryParam = searchParams.get("q") || "";
  const savedOnlyParam = searchParams.get("saved") === "1";

  const [localSearch, setLocalSearch] = useState(queryParam);
  const [selectedSize, setSelectedSize] = useState<SizeOption | "">("");
  const [selectedFabric, setSelectedFabric] = useState<
    Product["fabricFamily"] | ""
  >("");
  const [maxPrice, setMaxPrice] = useState<number>(150);
  const [sortBy, setSortBy] = useState<SortMode>("featured");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  function updateUrlParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "All") {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    });
    const qs = next.toString();
    router.replace(qs ? `/shop?${qs}` : "/shop", { scroll: false });
  }

  function clearAllFilters() {
    setLocalSearch("");
    setSelectedSize("");
    setSelectedFabric("");
    setMaxPrice(150);
    setSortBy("featured");
    router.replace("/shop", { scroll: false });
  }

  const effectiveSearch = queryParam || localSearch;

  const filteredProducts = useMemo(() => {
    const q = effectiveSearch.trim().toLowerCase();

    const list = products.filter((p) => {
      if (categoryParam !== "All" && p.category !== categoryParam) return false;
      if (collectionParam && p.collection !== collectionParam) return false;
      if (savedOnlyParam && !wishlist.includes(p.id)) return false;
      if (selectedFabric && p.fabricFamily !== selectedFabric) return false;
      if (p.price > maxPrice) return false;

      if (selectedSize) {
        const sizeObj = p.sizes.find(
          (s) => s.size === selectedSize && s.inStock
        );
        if (!sizeObj) return false;
      }

      if (q) {
        const haystack = [
          p.name,
          p.subtitle,
          p.category,
          p.collection,
          p.fabric,
          p.fabricFamily,
          p.description,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "newest":
          return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
        case "rating":
          return b.rating - a.rating;
        case "featured":
        default:
          return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      }
    });
  }, [
    products,
    categoryParam,
    collectionParam,
    savedOnlyParam,
    wishlist,
    selectedFabric,
    maxPrice,
    selectedSize,
    effectiveSearch,
    sortBy,
  ]);

  const hasActiveFilters =
    categoryParam !== "All" ||
    Boolean(collectionParam) ||
    Boolean(effectiveSearch) ||
    savedOnlyParam ||
    Boolean(selectedSize) ||
    Boolean(selectedFabric) ||
    maxPrice < 150;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Header Banner */}
      <div className="border-b border-[#EEDDE2] pb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
          {collectionParam
            ? collectionParam
            : savedOnlyParam
            ? "Saved Edit"
            : "Contemporary Women's Collection"}
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-light tracking-[-0.025em] text-[#0E0E10] sm:text-5xl">
              {savedOnlyParam
                ? "Saved Pieces"
                : categoryParam === "All"
                ? "All Styles"
                : categoryParam}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#63636B]">
              Refined everyday women&apos;s clothing across dresses, skirts,
              tops, pants, and modern day frocks.
            </p>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#9E5E6A]">
            Showing {filteredProducts.length} of {products.length} styles
          </p>
        </div>
      </div>

      {/* Exact 5 Category Pills */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {ALL_CATEGORIES.map((cat) => {
          const active = !savedOnlyParam && categoryParam === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() =>
                updateUrlParams({
                  category: cat === "All" ? null : cat,
                  saved: null,
                })
              }
              className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "bg-[#0E0E10] text-[#FFFFFF]"
                  : "border border-[#EEDDE2] bg-[#FFFFFF] text-[#0E0E10] hover:border-[#9E5E6A] hover:text-[#9E5E6A]"
              }`}
            >
              {cat}
            </button>
          );
        })}

        {wishlist.length > 0 && (
          <button
            type="button"
            onClick={() =>
              updateUrlParams({ saved: savedOnlyParam ? null : "1" })
            }
            className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${
              savedOnlyParam
                ? "bg-[#9E5E6A] text-[#FFFFFF]"
                : "border border-[#EEDDE2] bg-[#FAF5F6] text-[#9E5E6A] hover:border-[#9E5E6A]"
            }`}
          >
            Saved ({wishlist.length})
          </button>
        )}
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="mt-6 flex flex-col gap-4 border-y border-[#EEDDE2] py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersExpanded((v) => !v)}
            className={`inline-flex items-center gap-2 border px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
              filtersExpanded
                ? "border-[#9E5E6A] bg-[#9E5E6A] text-[#FFFFFF]"
                : "border-[#EEDDE2] bg-[#FFFFFF] text-[#0E0E10] hover:border-[#9E5E6A]"
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          {/* Inline Search */}
          <div className="flex items-center border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-1.5 focus-within:border-[#9E5E6A]">
            <SearchIcon className="w-3.5 h-3.5 text-[#9E5E6A]" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (queryParam) {
                  updateUrlParams({ q: e.target.value || null });
                }
              }}
              placeholder="Search dress, skirt, top, pants, frock..."
              aria-label="Filter catalog by keyword"
              className="ml-2 w-48 bg-transparent text-xs text-[#0E0E10] placeholder:text-[#63636B] focus:outline-none sm:w-60"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs text-[#9E5E6A] underline underline-offset-4 hover:text-[#0E0E10]"
            >
              <CloseIcon className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="shop-sort"
            className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#63636B]"
          >
            Sort
          </label>
          <select
            id="shop-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="border border-[#EEDDE2] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0E0E10] focus:border-[#9E5E6A] focus:outline-none"
          >
            <option value="featured">Curated Featured</option>
            <option value="newest">New Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Client Rating</option>
          </select>
        </div>
      </div>

      {/* Expandable Facet Panel */}
      {filtersExpanded && (
        <div className="grid grid-cols-1 gap-6 border-b border-[#EEDDE2] bg-[#FAF5F6] p-6 md:grid-cols-3">
          {/* Size Filter */}
          <div>
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9E5E6A]">
              Size
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_FILTERS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() =>
                    setSelectedSize((prev) => (prev === size ? "" : size))
                  }
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    selectedSize === size
                      ? "bg-[#0E0E10] text-[#FFFFFF]"
                      : "border border-[#EEDDE2] bg-[#FFFFFF] text-[#0E0E10] hover:border-[#9E5E6A]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Fabric Filter */}
          <div>
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9E5E6A]">
              Fabric
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FABRIC_FILTERS.map((fam) => (
                <button
                  key={fam}
                  type="button"
                  onClick={() =>
                    setSelectedFabric((prev) => (prev === fam ? "" : fam))
                  }
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    selectedFabric === fam
                      ? "bg-[#0E0E10] text-[#FFFFFF]"
                      : "border border-[#EEDDE2] bg-[#FFFFFF] text-[#0E0E10] hover:border-[#9E5E6A]"
                  }`}
                >
                  {fam}
                </button>
              ))}
            </div>
          </div>

          {/* Price Ceiling */}
          <div>
            <div className="mb-2.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-[#9E5E6A]">
              <span>Max Price</span>
              <span className="font-mono text-[#0E0E10]">Rs. {maxPrice}</span>
            </div>
            <input
              type="range"
              min={60}
              max={150}
              step={5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-label="Maximum price filter"
              className="w-full accent-[#9E5E6A]"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-[#63636B]">
              <span>Rs. 60</span>
              <span>Rs. 150</span>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {filteredProducts.length === 0 ? (
        <div className="my-16 border border-[#EEDDE2] bg-[#FAF5F6] p-12 text-center">
          <p className="text-2xl font-light tracking-[-0.02em] text-[#0E0E10]">
            {categoryParam === "Pants" &&
            !products.some((p) => p.category === "Pants")
              ? "Tailored Casual Pants Restocking Soon"
              : "No matching styles found"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#63636B]">
            {categoryParam === "Pants" &&
            !products.some((p) => p.category === "Pants")
              ? "Our new-season trousers are arriving shortly. Explore our current Dresses, Skirts, Tops, and Frocks in the meantime."
              : "Reset your filters to explore all dresses, skirts, tops, pants, and frocks."}
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-6 bg-[#0E0E10] px-6 py-3 text-xs font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
