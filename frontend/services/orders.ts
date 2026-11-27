import type {
  CheckoutOrderPayload,
  NewsletterResponse,
  OrderRecord,
  PromoCode,
  PromoValidationResponse,
  StoreConfig,
} from "@/lib/types";
import { ApiRequestError, apiFetch } from "./http";

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

export async function subscribeNewsletter(
  email: string,
  source: "footer" | "checkout" = "footer"
): Promise<NewsletterResponse> {
  return apiFetch<NewsletterResponse>("/newsletter/", {
    method: "POST",
    body: JSON.stringify({ email, source }),
  });
}
