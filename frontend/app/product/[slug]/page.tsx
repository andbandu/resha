import React, { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PRODUCTS,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/catalog";
import ProductDetailView from "@/components/ProductDetailView";

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata(
  props: PageProps<"/product/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);
  if (!product) {
    return { title: "Garment Not Found" };
  }
  return {
    title: product.name,
    description: product.subtitle,
  };
}

async function ProductResolver({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product, 4);
  return <ProductDetailView product={product} relatedProducts={related} />;
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
