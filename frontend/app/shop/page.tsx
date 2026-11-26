import React, { Suspense } from "react";
import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/catalog";
import ShopCatalog from "@/components/ShopCatalog";

export const metadata: Metadata = {
  title: "Shop Women's Wear",
  description:
    "Shop Resha's modern, classy women's casual wear across dresses, skirts, tops, pants, and frocks.",
};

function ShopLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse bg-[#E5E5E8]" />
      <div className="mt-4 h-4 w-96 animate-pulse bg-[#E5E5E8]" />
      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="space-y-3">
            <div className="aspect-[3/4] w-full animate-pulse bg-[#F5F5F7]" />
            <div className="h-4 w-3/4 animate-pulse bg-[#E5E5E8]" />
            <div className="h-4 w-1/4 animate-pulse bg-[#E5E5E8]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopLoadingSkeleton />}>
      <ShopCatalog products={PRODUCTS} />
    </Suspense>
  );
}
