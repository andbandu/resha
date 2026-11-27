import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/services/http";

const ALLOWED_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;

async function proxyToBackend(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  if (
    !Array.isArray(path) ||
    path.length === 0 ||
    path.some((seg) => !ALLOWED_SEGMENT_RE.test(seg) || seg === "..")
  ) {
    return NextResponse.json(
      { detail: "Invalid API endpoint path." },
      { status: 400 }
    );
  }

  const backendBase = getServerApiBaseUrl();
  const targetUrl = new URL(
    `/api/${path.map((seg) => encodeURIComponent(seg)).join("/")}/`,
    backendBase
  );
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const headers = new Headers();
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });

    const responseText = await upstream.text();
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) {
      responseHeaders.set("content-type", upstreamType);
    }

    return new NextResponse(responseText, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "Unable to reach the Resha Django backend API. Please verify the backend service is running.",
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, context);
}
