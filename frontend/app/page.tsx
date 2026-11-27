import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, getFeaturedProducts, getS3ImageUrl } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import { ArrowRightIcon, ShieldIcon } from "@/components/Icons";

export default function HomePage() {
  const featuredProducts = getFeaturedProducts();

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
                Five Curated Categories
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#E4DCE0]">
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.name}
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
            <Link href="/product/amani-dress" className="group block w-full">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7] lg:aspect-auto lg:min-h-[600px]">
                <Image
                  src={getS3ImageUrl("AMANI DRESS image 1.webp")}
                  alt="Amani Dusty Rose Pocket Dress"
                  fill
                  preload
                  quality={90}
                  sizes="(max-width: 1024px) 50vw, 375px"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10]/55 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-[#FFFFFF]">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#F2CFD6]">
                      01 · Dresses
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      Amani Rose Pocket Dress
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#F2CFD6]">Rs. 116</span>
                </div>
              </div>
            </Link>

            <Link href="/product/livia-dress" className="group block w-full">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7] lg:aspect-auto lg:min-h-[600px]">
                <Image
                  src={getS3ImageUrl("LIVIA DRESS image 1.webp")}
                  alt="Livia Blush Tiered Frock"
                  fill
                  preload
                  quality={90}
                  sizes="(max-width: 1024px) 50vw, 375px"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10]/55 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-[#FFFFFF]">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#F2CFD6]">
                      02 · Frocks
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      Livia Blush Tiered Frock
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#F2CFD6]">Rs. 96</span>
                </div>
              </div>
            </Link>
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
          {CATEGORIES.map((category, idx) => (
            <Link
              key={category.name}
              href={`/shop?category=${encodeURIComponent(category.name)}`}
              className={`group flex flex-col border border-[#EEDDE2] bg-[#FFFFFF] transition-colors hover:border-[#9E5E6A] ${
                idx === 4 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
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
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Tailored Everyday Separates Split */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-4 lg:col-span-6">
            <Link href="/product/brielle-top" className="group block">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                <Image
                  src={getS3ImageUrl("BRIELLE TOP image 3.webp")}
                  alt="Brielle Terracotta Peplum Top"
                  fill
                  sizes="(max-width: 1024px) 50vw, 310px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </Link>
            <Link href="/product/eve-top" className="group mt-6 block sm:mt-8">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F5F7]">
                <Image
                  src={getS3ImageUrl("EVE TOP image 1.webp")}
                  alt="Eve Tie-Front Vest Top"
                  fill
                  sizes="(max-width: 1024px) 50vw, 310px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </Link>
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
                <Link
                  href="/product/azalea-dress"
                  className="flex items-center justify-between py-1 text-[#0E0E10] hover:text-[#9E5E6A]"
                >
                  <span>Frocks · Azalea Smocked Sundress</span>
                  <span className="font-mono text-xs text-[#9E5E6A]">Rs. 98</span>
                </Link>
                <Link
                  href="/product/noel-skirt"
                  className="flex items-center justify-between py-1 text-[#0E0E10] hover:text-[#9E5E6A]"
                >
                  <span>Skirts · Noel Taupe Column Skirt</span>
                  <span className="font-mono text-xs text-[#9E5E6A]">Rs. 98</span>
                </Link>
                <Link
                  href="/product/esme-top"
                  className="flex items-center justify-between py-1 text-[#0E0E10] hover:text-[#9E5E6A]"
                >
                  <span>Tops · Esme Botanical Check Top</span>
                  <span className="font-mono text-xs text-[#9E5E6A]">Rs. 74</span>
                </Link>
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
              <Link href="/shop?category=Frocks" className="group block">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FFFFFF]">
                  <Image
                    src={getS3ImageUrl("BIANCA DRESS image 1.webp")}
                    alt="Bianca Ivory Eyelet Frock"
                    fill
                    sizes="(max-width: 1024px) 33vw, 220px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2.5 left-2.5 border border-[#EEDDE2] bg-[#FFFFFF]/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7D4652]">
                    Frocks
                  </span>
                </div>
              </Link>
              <Link href="/shop?category=Skirts" className="group block">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FFFFFF]">
                  <Image
                    src={getS3ImageUrl("KIVI SKIRT image 1.webp")}
                    alt="Kivi Ivory Gathered Skirt"
                    fill
                    sizes="(max-width: 1024px) 33vw, 220px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2.5 left-2.5 border border-[#EEDDE2] bg-[#FFFFFF]/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7D4652]">
                    Skirts
                  </span>
                </div>
              </Link>
              <Link href="/shop?category=Tops" className="group block">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FFFFFF]">
                  <Image
                    src={getS3ImageUrl("KATHY TOP image 1.webp")}
                    alt="Kathy Pastel Motif Top"
                    fill
                    sizes="(max-width: 1024px) 33vw, 220px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2.5 left-2.5 border border-[#EEDDE2] bg-[#FFFFFF]/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7D4652]">
                    Tops
                  </span>
                </div>
              </Link>
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
                Free tracked courier dispatch worldwide on orders above Rs. 120 in
                our signature garment packaging.
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
