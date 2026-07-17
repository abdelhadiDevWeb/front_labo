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
  // fetch() already decompresses the body; forwarding this header makes the
  // browser try to gunzip plain text → ERR_CONTENT_DECODING_FAILED on every call.
  "content-encoding",
  "accept-encoding",
]);

const resolveBackendApiBase = (frontendOrigin?: string): string | null => {
  const raw =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";

  if (!raw) {
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:8000/api";
    }
    return null;
  }

  let absolute = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(absolute)) {
    absolute = `https://${absolute}`;
  }
  const withApi = absolute.includes("/api") ? absolute : `${absolute}/api`;

  // Same Hostinger host for front + env API → calling ourselves loops forever.
  // Prefer API_INTERNAL_URL, else local Express on PORT.
  try {
    if (frontendOrigin) {
      const apiOrigin = new URL(withApi).origin;
      if (apiOrigin === frontendOrigin) {
        const internal = process.env.API_INTERNAL_URL?.trim();
        if (internal) {
          let i = internal.replace(/\/$/, "");
          if (!/^https?:\/\//i.test(i)) i = `http://${i}`;
          return i.includes("/api") ? i : `${i}/api`;
        }
        const port = process.env.BACKEND_PORT || process.env.PORT || "8000";
        return `http://127.0.0.1:${port}/api`;
      }
    }
  } catch {
    // keep withApi
  }

  return withApi;
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

const buildTargetUrl = (req: NextRequest, pathParts: string[]): string | null => {
  const base = resolveBackendApiBase(req.nextUrl.origin);
  if (!base) return null;
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
  if (!targetUrl) {
    console.error(
      "[api-proxy] NEXT_PUBLIC_API_URL / API_INTERNAL_URL is not set — cannot reach the backend."
    );
    return NextResponse.json(
      {
        success: false,
        message:
          "Configuration serveur manquante (URL de l'API). Contactez l'administrateur.",
      },
      { status: 502 }
    );
  }
  const isHttps = req.nextUrl.protocol === "https:";

  const headers = new Headers();
  req.headers.forEach((value: string, key: string) => {
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
  upstream.headers.forEach((value: string, key: string) => {
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
