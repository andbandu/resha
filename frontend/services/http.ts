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
    if (isLoopbackHost(parsed.hostname)) {
      return isLoopbackHost(currentHost) && parsed.hostname === currentHost;
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

export async function apiFetch<T>(
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
