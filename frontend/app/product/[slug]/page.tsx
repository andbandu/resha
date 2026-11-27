import React, { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProductBySlug, fetchProducts } from "@/lib/catalog";
import type { ProductDetail } from "@/lib/types";
import ProductDetailView from "@/components/ProductDetailView";
import ApiErrorState from "@/components/ApiErrorState";

export async function generateStaticParams() {
  try {
    const products = await fetchProducts();
    if (products.length > 0) {
      return products.map((product) => ({
        slug: product.slug,
      }));
    }
  } catch {
    // Backend may be unavailable during standalone image build; stream on demand at runtime.
  }
  return [{ slug: "__placeholder__" }];
}

export async function generateMetadata(
  props: PageProps<"/product/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  if (slug === "__placeholder__") {
    return { title: "Garment Not Found" };
  }

  try {
    const product = await fetchProductBySlug(slug);
    if (!product) {
      return { title: "Garment Not Found" };
    }
    return {
      title: product.name,
      description: product.subtitle,
    };
  } catch {
    return { title: "Garment Details" };
  }
}

async function ProductResolver({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "__placeholder__") {
    notFound();
  }

  let product: ProductDetail | null = null;
  let loadFailed = false;

  try {
    product = await fetchProductBySlug(slug);
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <ApiErrorState
          title="Unable to Load Garment"
          description="We could not load this garment from the Django backend API right now. Please try again."
        />
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailView
      key={product.id}
      product={product}
      relatedProducts={product.relatedProducts ?? []}
    />
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="aspect-[3/4] w-full animate-pulse bg-[#F5F5F7] lg:col-span-7" />
        <div className="space-y-5 lg:col-span-5">
          <div className="h-4 w-36 animate-pulse bg-[#E5E5E8]" />
          <div className="h-10 w-3/4 animate-pulse bg-[#E5E5E8]" />
          <div className="h-6 w-24 animate-pulse bg-[#E5E5E8]" />
          <div className="h-32 w-full animate-pulse bg-[#F5F5F7]" />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductResolver params={props.params} />
    </Suspense>
  );
}
