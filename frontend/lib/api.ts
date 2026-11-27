import type {
  CategoryItem,
  CheckoutOrderPayload,
  CollectionItem,
  NewsletterResponse,
  OrderRecord,
  Product,
  ProductDetail,
  ProductReview,
  PromoCode,
  PromoValidationResponse,
  ReviewCreatePayload,
  StoreConfig,
} from "./types";

const S3_BASE_URL = (
  process.env.NEXT_PUBLIC_S3_BASE_URL ??
  "https://resha-images.s3.ap-southeast-2.amazonaws.com"
).replace(/\/+$/, "");

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: "RESHA",
  freeShippingThreshold: 120,
  standardShippingCost: 18,
  expressShippingCost: 32,
  taxRatePercent: 8,
  announcementText:
    "Complimentary Express Shipping Over Rs. 120 · New Season Casualwear",
  featuredPromoCode: "RESHA10",
};

/** Resolve an S3 filename or legacy `/images/...` path to a full URL. */
export function getS3ImageUrl(fileNameOrPath: string): string {
  if (!fileNameOrPath) return "";
  if (/^https?:\/\//i.test(fileNameOrPath)) {
    return fileNameOrPath;
  }
  const cleanedName = fileNameOrPath.replace(/^\/?images\//i, "");
  return `${S3_BASE_URL}/${encodeURIComponent(cleanedName)}`;
}

export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${formatted}`;
}

function normalizeBaseOrigin(raw?: string): string {
  if (!raw) return "";
  return raw.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

export function getServerApiBaseUrl(): string {
  const raw =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000";
  return normalizeBaseOrigin(raw) || "http://127.0.0.1:8000";
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function canUseDirectPublicApi(publicBase: string): boolean {
  if (!publicBase || typeof window === "undefined") return false;
  try {
    const parsed = new URL(publicBase, window.location.origin);
    const currentHost = window.location.hostname;
    // Avoid loopback mismatch CORS errors (e.g. 127.0.0.1:3000 -> localhost:8000)
    // and avoid remote browsers trying to call a build-time localhost API URL.
    if (isLoopbackHost(parsed.hostname)) {
      return (
        isLoopbackHost(currentHost) && parsed.hostname === currentHost
      );
    }
    return true;
  } catch {
    return false;
  }
}

function splitPathAndQuery(apiPath: string): { path: string; query: string } {
  const idx = apiPath.indexOf("?");
  if (idx === -1) {
    return { path: apiPath, query: "" };
  }
  return {
    path: apiPath.slice(0, idx),
    query: apiPath.slice(idx),
  };
}

function buildApiUrl(apiPath: string): string {
  const { path, query } = splitPathAndQuery(apiPath);
  const cleanSegment = path.replace(/^\/+/, "").replace(/\/+$/, "");

  if (typeof window === "undefined") {
    const base = getServerApiBaseUrl();
    return `${base}/api/${cleanSegment}/${query}`;
  }

  const publicBase = normalizeBaseOrigin(process.env.NEXT_PUBLIC_API_URL);
  if (publicBase && canUseDirectPublicApi(publicBase)) {
    return `${publicBase}/api/${cleanSegment}/${query}`;
  }

  // Same-origin Next.js BFF proxy (/bff/... -> Django /api/.../)
  return `/bff/${cleanSegment}${query}`;
}

export class ApiRequestError extends Error {
  status: number;
  data: unknown;
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    data: unknown = null,
    fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
    this.fieldErrors = fieldErrors;
  }
}

function extractErrorDetails(
  data: unknown,
  fallback: string
): { message: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (!data || typeof data !== "object") {
    return { message: fallback, fieldErrors };
  }

  const record = data as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return { message: record.message, fieldErrors };
  }
  if (typeof record.detail === "string" && record.detail.trim()) {
    return { message: record.detail, fieldErrors };
  }

  let firstMsg = "";
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && value.length > 0) {
      const msg = String(value[0]);
      fieldErrors[key] = msg;
      if (!firstMsg) firstMsg = msg;
    } else if (typeof value === "string" && value.trim()) {
      fieldErrors[key] = value;
      if (!firstMsg) firstMsg = value;
    }
  }

  return {
    message: firstMsg || fallback,
    fieldErrors,
  };
}

async function apiFetch<T>(
  apiPath: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 10000, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(buildApiUrl(apiPath), {
      cache: "no-store",
      ...rest,
      headers: {
        Accept: "application/json",
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      signal: options.signal ?? controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => null);

    if (!res.ok) {
      const { message, fieldErrors } = extractErrorDetails(
        data,
        `Request failed (${res.status})`
      );
      throw new ApiRequestError(message, res.status, data, fieldErrors);
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

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

export async function fetchStoreConfig(): Promise<StoreConfig> {
  return apiFetch<StoreConfig>("/store-config/");
}

export async function fetchPromos(): Promise<PromoCode[]> {
  return apiFetch<PromoCode[]>("/promos/");
}

export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<PromoValidationResponse> {
  try {
    return await apiFetch<PromoValidationResponse>("/promos/validate/", {
      method: "POST",
      body: JSON.stringify({ code, subtotal }),
    });
  } catch (err) {
    if (
      err instanceof ApiRequestError &&
      err.data &&
      typeof err.data === "object"
    ) {
      const payload = err.data as Partial<PromoValidationResponse>;
      if (typeof payload.message === "string") {
        return {
          ok: false,
          message: payload.message,
          promo: payload.promo ?? null,
          discountAmount: payload.discountAmount ?? 0,
        };
      }
    }
    throw err;
  }
}

export async function createOrder(
  payload: CheckoutOrderPayload
): Promise<OrderRecord> {
  return apiFetch<OrderRecord>("/orders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function lookupOrder(
  orderNumber: string,
  email: string
): Promise<OrderRecord> {
  const qs = new URLSearchParams({ email }).toString();
  return apiFetch<OrderRecord>(
    `/orders/${encodeURIComponent(orderNumber)}/?${qs}`
  );
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

export async function subscribeNewsletter(
  email: string,
  source: "footer" | "checkout" = "footer"
): Promise<NewsletterResponse> {
  return apiFetch<NewsletterResponse>("/newsletter/", {
    method: "POST",
    body: JSON.stringify({ email, source }),
  });
}
