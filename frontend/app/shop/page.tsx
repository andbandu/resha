import React, { Suspense } from "react";
import type { Metadata } from "next";
import { fetchCategories, fetchProducts } from "@/lib/catalog";
import type { CategoryItem, Product } from "@/lib/types";
import ShopCatalog from "@/components/ShopCatalog";
import ApiErrorState from "@/components/ApiErrorState";

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

async function ShopCatalogLoader() {
  let products: Product[] = [];
  let categories: CategoryItem[] = [];
  let loadFailed = false;

  try {
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
    ]);
    products = fetchedProducts;
    categories = fetchedCategories;
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <ApiErrorState
          title="Unable to Load Catalog"
          description="We could not reach the Resha Django backend API to load our catalog. Please ensure the backend server is running and try again."
        />
      </div>
    );
  }

  return <ShopCatalog products={products} categories={categories} />;
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopLoadingSkeleton />}>
      <ShopCatalogLoader />
    </Suspense>
  );
}
