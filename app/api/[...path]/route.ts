import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const resolveBackendApiBase = (): string => {
  const raw =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";

  if (!raw) {
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:8000/api";
    }
    throw new Error("API_INTERNAL_URL or NEXT_PUBLIC_API_URL must be set");
  }

  const normalized = raw.replace(/\/$/, "");
  return normalized.includes("/api") ? normalized : `${normalized}/api`;
};

/**
 * Make upstream Set-Cookie first-party for the Hostinger frontend domain.
 * Next rewrites often drop or leave Domain=api… so sessions never stick.
 */
const rewriteSetCookieForFrontend = (
  setCookie: string,
  isHttps: boolean
): string => {
  let value = setCookie
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*SameSite=[^;]*/gi, "");

  // Same-origin /api proxy → Lax is correct and works on Hostinger HTTPS.
  value += "; SameSite=Lax";

  if (isHttps) {
    if (!/;\s*Secure/i.test(value)) {
      value += "; Secure";
    }
  } else {
    value = value.replace(/;\s*Secure/gi, "");
  }

  return value;
};

const buildTargetUrl = (req: NextRequest, pathParts: string[]): string => {
  const base = resolveBackendApiBase();
  const suffix = pathParts.map(encodeURIComponent).join("/");
  const url = new URL(`${base}/${suffix}`);
  url.search = req.nextUrl.search;
  return url.toString();
};

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(req, path || []);
  const isHttps = req.nextUrl.protocol === "https:";

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "origin") return;
    headers.set(key, value);
  });

  // Help the Express app pick cookie/CORS policy for the real browser site.
  headers.set("origin", req.nextUrl.origin);
  headers.set("x-forwarded-host", req.headers.get("host") || req.nextUrl.host);
  headers.set("x-forwarded-proto", isHttps ? "https" : "http");
  headers.set("x-ml-bff", "1");

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    console.error("[api-proxy] upstream fetch failed", targetUrl, err);
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de joindre le serveur API. Vérifiez NEXT_PUBLIC_API_URL / API_INTERNAL_URL.",
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "set-cookie") return;
    responseHeaders.set(key, value);
  });

  const getSetCookie = (
    upstream.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie?.();

  if (getSetCookie && getSetCookie.length > 0) {
    for (const cookie of getSetCookie) {
      responseHeaders.append(
        "set-cookie",
        rewriteSetCookieForFrontend(cookie, isHttps)
      );
    }
  } else {
    const single = upstream.headers.get("set-cookie");
    if (single) {
      responseHeaders.append(
        "set-cookie",
        rewriteSetCookieForFrontend(single, isHttps)
      );
    }
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
