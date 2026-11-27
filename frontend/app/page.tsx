import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DEFAULT_STORE_CONFIG,
  fetchCategories,
  fetchProducts,
  fetchStoreConfig,
  formatPrice,
} from "@/lib/catalog";
import type { CategoryItem, Product, StoreConfig } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import ApiErrorState from "@/components/ApiErrorState";
import { ArrowRightIcon, ShieldIcon } from "@/components/Icons";

function pickEditorialProduct(
  products: Product[],
  preferredSlug: string,
  fallbackCategory?: string,
  excludeSlugs: string[] = []
): Product | undefined {
  const bySlug = products.find((p) => p.slug === preferredSlug);
  if (bySlug) return bySlug;

  if (fallbackCategory) {
    const byCategory = products.find(
      (p) =>
        p.category.toLowerCase() === fallbackCategory.toLowerCase() &&
        !excludeSlugs.includes(p.slug)
    );
    if (byCategory) return byCategory;
  }

  return products.find((p) => !excludeSlugs.includes(p.slug));
}

function getProductCardImage(product?: Product, preferredIndex = 0): string {
  if (!product) return "";
  return (
    product.images[preferredIndex]?.src ||
    product.images[0]?.src ||
    product.colors[0]?.image ||
    ""
  );
}

function getCategoryImage(
  categoryName: string,
  categories: CategoryItem[],
  products: Product[]
): string {
  const cat = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (cat?.image) return cat.image;
  const match = products.find(
    (p) => p.category.toLowerCase() === categoryName.toLowerCase()
  );
  return getProductCardImage(match);
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col bg-[#FFFFFF]">
      <section className="w-full border-b border-[#EEDDE2] bg-[#0E0E10] text-[#FFFFFF]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-12">
          <div className="flex flex-col justify-between px-6 py-14 sm:px-10 sm:py-20 lg:col-span-5 lg:py-24">
            <div className="space-y-6">
              <div className="h-7 w-48 animate-pulse bg-[#262124]" />
              <div className="h-24 w-4/5 animate-pulse bg-[#262124]" />
              <div className="h-16 w-full animate-pulse bg-[#1D181B]" />
              <div className="flex gap-3 pt-2">
                <div className="h-12 w-40 animate-pulse bg-[#FFFFFF]/20" />
                <div className="h-12 w-36 animate-pulse bg-[#262124]" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#262124] lg:col-span-7">
            <div className="aspect-[3/4] w-full animate-pulse bg-[#1A1517] lg:min-h-[600px]" />
            <div className="aspect-[3/4] w-full animate-pulse bg-[#1A1517] lg:min-h-[600px]" />
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="h-10 w-72 animate-pulse bg-[#F5F5F7]" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="aspect-[3/4] w-full animate-pulse bg-[#F5F5F7]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

async function HomeStorefrontContent() {
  let categories: CategoryItem[] = [];
  let products: Product[] = [];
  let storeConfig: StoreConfig = DEFAULT_STORE_CONFIG;
  let loadFailed = false;

  try {
    const [fetchedCategories, fetchedProducts, fetchedConfig] =
      await Promise.all([
        fetchCategories(),
        fetchProducts(),
        fetchStoreConfig().catch(() => DEFAULT_STORE_CONFIG),
      ]);
    categories = fetchedCategories;
    products = fetchedProducts;
    storeConfig = fetchedConfig;
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <ApiErrorState
          title="Unable to Load Resha Storefront"
          description="We could not fetch the latest collection from the Django backend API. Verify the backend server is running and refresh."
          showHomeLink={false}
        />
      </div>
    );
  }

  const featuredProducts = products.filter((p) => p.featured);
  const signatureEdit =
    featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6);

  const heroPrimary = pickEditorialProduct(products, "amani-dress", "Dresses");
  const heroSecondary = pickEditorialProduct(
    products,
    "livia-dress",
    "Frocks",
    heroPrimary ? [heroPrimary.slug] : []
  );

  const separatePrimary = pickEditorialProduct(products, "brielle-top", "Tops");
  const separateSecondary = pickEditorialProduct(
    products,
    "eve-top",
    "Tops",
    separatePrimary ? [separatePrimary.slug] : []
  );

  const showcaseItems = [
    pickEditorialProduct(products, "azalea-dress", "Frocks"),
    pickEditorialProduct(products, "noel-skirt", "Skirts"),
    pickEditorialProduct(products, "esme-top", "Tops"),
  ].filter((item): item is Product => Boolean(item));

  const showcaseCategories = ["Frocks", "Skirts", "Tops"].map((catName) => ({
    name: catName,
    image: getCategoryImage(catName, categories, products),
  }));

  const heroPrimaryImg = getProductCardImage(heroPrimary);
  const heroSecondaryImg = getProductCardImage(heroSecondary);
  const separatePrimaryImg = getProductCardImage(separatePrimary, 2);
  const separateSecondaryImg = getProductCardImage(separateSecondary);

  return (
    <div className="flex flex-col bg-[#FFFFFF]">
      {/* 1. Modern Architectural Split Hero with Soft Rose Touch */}
      <section className="w-full border-b border-[#EEDDE2] bg-[#0E0E10] text-[#FFFFFF]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-12">
          {/* Left Editorial Statement */}
          <div className="flex flex-col justify-between px-6 py-14 sm:px-10 sm:py-20 lg:col-span-5 lg:py-24">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 border border-[#3E2E33] bg-[#1A1517] px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E8B4BE]" />
                <span className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#E8B4BE]">
                  New Season Collection
                </span>
              </div>

              <h1 className="text-4xl font-light leading-[1.06] tracking-[-0.03em] text-[#FFFFFF] sm:text-5xl xl:text-[56px]">
                Modern Class.
                <br />
                Effortless{" "}
                <span className="text-[#F0CCD3] font-normal">Poise.</span>
              </h1>

              <p className="max-w-md text-sm leading-relaxed text-[#C2C0C6] sm:text-base">
                Sleek women&apos;s casual wear tailored for elevated everyday
                dressing — crisp silhouettes across dresses, skirts, tops,
                pants, and day frocks.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2.5 bg-[#FFFFFF] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0E0E10] transition-colors hover:bg-[#F5DCE1]"
                >
                  Shop Collection
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  href="/shop?category=Dresses"
                  className="inline-flex items-center gap-2 border border-[#544047] px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#F5DCE1] transition-colors hover:border-[#E8B4BE] hover:bg-[#1D1619]"
                >
                  View Dresses
                </Link>
              </div>
            </div>

            <div className="mt-12 border-t border-[#262124] pt-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#9B858C]">
                {categories.length} Curated Categories
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#E4DCE0]">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/shop?category=${encodeURIComponent(c.name)}`}
                    className="transition-colors hover:text-[#E8B4BE]"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Dual Studio Lookbook Panels */}
          <div className="grid grid-cols-2 gap-px bg-[#262124] lg:col-span-7">
            {heroPrimary && (
              <Link
                href={`/product/${heroPrimary.slug}`}
                className="group block w-full"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7] lg:aspect-auto lg:min-h-[600px]">
                  {heroPrimaryImg && (
                    <Image
                      src={heroPrimaryImg}
                      alt={heroPrimary.name}
                      fill
                      preload
                      quality={90}
                      sizes="(max-width: 1024px) 50vw, 375px"
                      className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10]/55 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-[#FFFFFF]">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F2CFD6]">
                        01 · {heroPrimary.category}
                      </p>
                      <p className="mt-0.5 text-sm font-medium">
                        {heroPrimary.name}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-[#F2CFD6]">
                      {formatPrice(heroPrimary.price)}
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {heroSecondary && (
              <Link
                href={`/product/${heroSecondary.slug}`}
                className="group block w-full"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7] lg:aspect-auto lg:min-h-[600px]">
                  {heroSecondaryImg && (
                    <Image
                      src={heroSecondaryImg}
                      alt={heroSecondary.name}
                      fill
                      preload
                      quality={90}
                      sizes="(max-width: 1024px) 50vw, 375px"
                      className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10]/55 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-[#FFFFFF]">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F2CFD6]">
                        02 · {heroSecondary.category}
                      </p>
                      <p className="mt-0.5 text-sm font-medium">
                        {heroSecondary.name}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-[#F2CFD6]">
                      {formatPrice(heroSecondary.price)}
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 2. Exact 5-Category Gallery Strip */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
              Shop by Category
            </p>
            <h2 className="mt-2 text-3xl font-light tracking-[-0.025em] text-[#0E0E10] sm:text-4xl">
              The Five Pillars of Modern Dressing
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#0E0E10] underline decoration-[#E8B4BE] underline-offset-8 transition-colors hover:text-[#9E5E6A] hover:decoration-[#9E5E6A]"
          >
            View All Styles
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category, idx) => (
            <Link
              key={category.slug}
              href={`/shop?category=${encodeURIComponent(category.name)}`}
              className={`group flex flex-col border border-[#EEDDE2] bg-[#FFFFFF] transition-colors hover:border-[#9E5E6A] ${
                idx === 4 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                {category.image && (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                )}
              </div>
              <div className="p-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#9E5E6A]">
                  {category.tagline}
                </p>
                <h3 className="mt-1 text-lg font-medium tracking-[-0.01em] text-[#0E0E10] group-hover:text-[#9E5E6A] transition-colors">
                  {category.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#63636B]">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Modern Pieces on Pearl Blush Band */}
      <section className="border-y border-[#EEDDE2] bg-[#FAF5F6] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
                Curated Edit
              </p>
              <h2 className="mt-2 text-3xl font-light tracking-[-0.025em] text-[#0E0E10] sm:text-4xl">
                Signature Silhouettes
              </h2>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 border border-[#0E0E10] bg-[#FFFFFF] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#9E5E6A] hover:text-[#FFFFFF]"
            >
              Shop Entire Edit
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
            {signatureEdit.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Tailored Everyday Separates Split */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-4 lg:col-span-6">
            {separatePrimary && (
              <Link
                href={`/product/${separatePrimary.slug}`}
                className="group block"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                  {separatePrimaryImg && (
                    <Image
                      src={separatePrimaryImg}
                      alt={separatePrimary.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 310px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
              </Link>
            )}
            {separateSecondary && (
              <Link
                href={`/product/${separateSecondary.slug}`}
                className="group mt-6 block sm:mt-8"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                  {separateSecondaryImg && (
                    <Image
                      src={separateSecondaryImg}
                      alt={separateSecondary.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 310px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
              </Link>
            )}
          </div>

          <div className="space-y-6 lg:col-span-6 lg:pl-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
              Tailored Ease
            </p>
            <h2 className="text-3xl font-light leading-tight tracking-[-0.025em] text-[#0E0E10] sm:text-5xl">
              Clean lines engineered for all-day movement.
            </h2>
            <p className="text-sm leading-relaxed text-[#63636B] sm:text-base">
              Every piece in the Resha collection balances sharp tailored
              proportions with breathable comfort — structured waistbands, fluid
              silks, and crisp cuts that hold their elegance from morning
              coffee to evening plans.
            </p>

            <div className="grid grid-cols-1 gap-4 border-t border-[#EEDDE2] pt-6 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[11px] font-medium text-[#9E5E6A]">
                  01 · FIT
                </p>
                <p className="mt-1 text-sm font-medium text-[#0E0E10]">
                  Clean Proportions
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#63636B]">
                  Flattering high-rise cuts and fluid drape across XS–XL.
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] font-medium text-[#9E5E6A]">
                  02 · FEEL
                </p>
                <p className="mt-1 text-sm font-medium text-[#0E0E10]">
                  Refined Fabrics
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#63636B]">
                  Mulberry silk, fine European linen, and combed cotton twill.
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] font-medium text-[#9E5E6A]">
                  03 · PALETTE
                </p>
                <p className="mt-1 text-sm font-medium text-[#0E0E10]">
                  Blush &amp; Neutrals
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#63636B]">
                  Chic neutrals touched with soft dusty rose tones.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/shop?category=Tops"
                className="inline-flex items-center gap-2 bg-[#0E0E10] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
              >
                Shop Tops
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/shop?category=Skirts"
                className="inline-flex items-center gap-2 border border-[#0E0E10] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#FAF5F6]"
              >
                Shop Skirts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Contemporary Capsule Showcase */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="border border-[#EEDDE2] bg-[#FAF5F6] p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
                Contemporary Wardrobe
              </p>
              <h2 className="text-3xl font-light leading-tight tracking-[-0.025em] text-[#0E0E10] sm:text-4xl">
                Dresses, Frocks &amp; Draped Separates
              </h2>
              <p className="text-sm leading-relaxed text-[#63636B]">
                Minimalist silhouettes crafted for women who appreciate quiet
                confidence—clean-cut frocks, bias midi skirts, and sculptural
                blouses ready for any occasion.
              </p>

              <div className="space-y-2.5 border-t border-[#EEDDE2] pt-5 text-sm">
                {showcaseItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/product/${item.slug}`}
                    className="flex items-center justify-between py-1 text-[#0E0E10] hover:text-[#9E5E6A]"
                  >
                    <span>
                      {item.category} · {item.name}
                    </span>
                    <span className="font-mono text-xs text-[#9E5E6A]">
                      {formatPrice(item.price)}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="pt-1">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 border border-[#0E0E10] bg-[#FFFFFF] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A] hover:bg-[#9E5E6A] hover:text-[#FFFFFF]"
                >
                  Explore Full Collection
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:col-span-7">
              {showcaseCategories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className="group block"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FFFFFF]">
                    {cat.image && (
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 1024px) 33vw, 220px"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute bottom-2.5 left-2.5 border border-[#EEDDE2] bg-[#FFFFFF]/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7D4652]">
                      {cat.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Store Service Pillars */}
      <section className="border-t border-[#EEDDE2] bg-[#FFFFFF]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-[#EEDDE2] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-start gap-4 px-6 py-10 sm:px-8">
            <ShieldIcon className="mt-0.5 w-5 h-5 shrink-0 text-[#9E5E6A]" />
            <div>
              <h3 className="text-base font-medium text-[#0E0E10]">
                Refined Everyday Fabrics
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#63636B]">
                Fluid silk, fine tailored linen, and smooth cotton twill crafted
                for polished all-day wear.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 px-6 py-10 sm:px-8">
            <ShieldIcon className="mt-0.5 w-5 h-5 shrink-0 text-[#9E5E6A]" />
            <div>
              <h3 className="text-base font-medium text-[#0E0E10]">
                Complimentary Express Shipping
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#63636B]">
                Free tracked courier dispatch worldwide on orders above{" "}
                {formatPrice(storeConfig.freeShippingThreshold)} in our
                signature garment packaging.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 px-6 py-10 sm:px-8">
            <ShieldIcon className="mt-0.5 w-5 h-5 shrink-0 text-[#9E5E6A]" />
            <div>
              <h3 className="text-base font-medium text-[#0E0E10]">
                30-Day Effortless Exchanges
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#63636B]">
                Seamless home try-ons with complimentary size exchanges and
                hassle-free returns.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeStorefrontContent />
    </Suspense>
  );
}
