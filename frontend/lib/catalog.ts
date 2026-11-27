import type { StoreConfig } from "./types";

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
