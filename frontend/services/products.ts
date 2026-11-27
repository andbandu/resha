import type {
  CategoryItem,
  CollectionItem,
  Product,
  ProductDetail,
  ProductReview,
  ReviewCreatePayload,
} from "@/lib/types";
import { ApiRequestError, apiFetch } from "./http";

export interface ProductQueryFilters {
  category?: string;
  collection?: string;
  fabricFamily?: string;
  size?: string;
  maxPrice?: number;
  featured?: boolean;
  isNew?: boolean;
  q?: string;
  sort?: string;
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  return apiFetch<CategoryItem[]>("/categories/");
}

export async function fetchCollections(): Promise<CollectionItem[]> {
  return apiFetch<CollectionItem[]>("/collections/");
}

export async function fetchProducts(
  filters?: ProductQueryFilters
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== "All") {
    params.set("category", filters.category);
  }
  if (filters?.collection) params.set("collection", filters.collection);
  if (filters?.fabricFamily) params.set("fabric_family", filters.fabricFamily);
  if (filters?.size) params.set("size", filters.size);
  if (typeof filters?.maxPrice === "number") {
    params.set("max_price", String(filters.maxPrice));
  }
  if (filters?.featured) params.set("featured", "true");
  if (filters?.isNew) params.set("is_new", "true");
  if (filters?.q) params.set("q", filters.q);
  if (filters?.sort) params.set("sort", filters.sort);

  const qs = params.toString();
  return apiFetch<Product[]>(qs ? `/products/?${qs}` : "/products/");
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  return fetchProducts({ featured: true });
}

export async function fetchProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  try {
    return await apiFetch<ProductDetail>(
      `/products/${encodeURIComponent(slug)}/`
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function submitProductReview(
  slug: string,
  payload: ReviewCreatePayload
): Promise<ProductReview> {
  return apiFetch<ProductReview>(
    `/products/${encodeURIComponent(slug)}/reviews/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}
