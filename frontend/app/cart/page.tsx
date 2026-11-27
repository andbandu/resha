import React, { Suspense } from "react";
import type { Metadata } from "next";
import { fetchProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Shopping Bag",
  description:
    "Review your selected Resha Clothing garments, apply atelier privilege codes, and proceed to checkout.",
};

function CartSkeleton() {
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

async function CartLoader() {
  let products: Product[] = [];
  try {
    products = await fetchProducts();
  } catch {
    // Allow viewing and checking out the local shopping bag even if cross-sell API fails
    products = [];
  }
  return <CartView recommendedPool={products} />;
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartLoader />
    </Suspense>
  );
}
