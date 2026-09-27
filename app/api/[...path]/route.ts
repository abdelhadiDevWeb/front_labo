import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  BFF_CLIENT_IP_HEADER,
  BFF_SECRET_HEADER,
  bffClientHeaders,
} from "@/lib/bff-server-headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_ID_HEADER = "x-request-id";
// Same format the backend accepts (backEnd_Labo/utils/logger.ts)
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const NOINDEX = "noindex, nofollow, noarchive";

const envMs = (name: string, fallback: number): number => {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/** Max wait for the backend's response headers once the request body is fully sent. */
const UPSTREAM_TIMEOUT_MS = envMs("API_PROXY_TIMEOUT_MS", 30_000);
const RETRY_DELAY_MS = 250;
// Connection-level failures (backend restarting, stale keep-alive socket)
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "UND_ERR_SOCKET",
]);

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
  // Undici (Node fetch) rejects Expect — causes 502 on login/register POSTs.
  "expect",
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
      // Prefer 127.0.0.1 — `localhost` can resolve to ::1 and briefly ECONNREFUSED
      // while Express is only bound / ready on IPv4.
      return "http://127.0.0.1:8000/api";
    }
    return null;
  }

  let absolute = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(absolute)) {
    absolute = `https://${absolute}`;
  }
  // Avoid intermittent ::1 ECONNREFUSED against a backend listening on 0.0.0.0 / IPv4.
  absolute = absolute.replace(
    /^http:\/\/localhost(?=[:/]|$)/i,
    "http://127.0.0.1"
  );
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

/** Headers named in `Connection` are hop-by-hop too (RFC 9110 §7.6.1). */
const connectionTokens = (headers: Headers): Set<string> =>
  new Set(
    (headers.get("connection") || "")
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
  );

const resolveRequestId = (req: NextRequest): string => {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
};

const upstreamErrorCode = (err: unknown): string | undefined => {
  const cause = (err as { cause?: { code?: string; errors?: { code?: string }[] } })
    ?.cause;
  return cause?.code ?? cause?.errors?.[0]?.code;
};

const proxyError = (status: number, message: string, requestId: string) =>
  NextResponse.json(
    { success: false, message },
    {
      status,
      headers: {
        "cache-control": "no-store",
        [REQUEST_ID_HEADER]: requestId,
        "x-robots-tag": NOINDEX,
      },
    }
  );

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const requestId = resolveRequestId(req);
  const logPath = `/api/${path.join("/")}`;

  // `..` would resolve outside /api on the backend once turned into a URL.
  if (path.some((part) => part === "." || part === "..")) {
    return proxyError(400, "Chemin invalide.", requestId);
  }

  const targetUrl = buildTargetUrl(req, path);
  if (!targetUrl) {
    console.error(
      "[api-proxy] NEXT_PUBLIC_API_URL / API_INTERNAL_URL is not set — cannot reach the backend."
    );
    return proxyError(
      502,
      "Configuration serveur manquante (URL de l'API). Contactez l'administrateur.",
      requestId
    );
  }
  const isHttps = req.nextUrl.protocol === "https:";

  const headers = new Headers();
  const requestConnectionTokens = connectionTokens(req.headers);
  req.headers.forEach((value: string, key: string) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || requestConnectionTokens.has(lower)) return;
    if (lower === "origin") return;
    // Only this proxy may assert the client IP — never forward browser-supplied values.
    if (lower === BFF_CLIENT_IP_HEADER || lower === BFF_SECRET_HEADER) return;
    headers.set(key, value);
  });

  // Help the Express app pick cookie/CORS policy for the real browser site.
  headers.set("origin", req.nextUrl.origin);
  headers.set("x-forwarded-host", req.headers.get("host") || req.nextUrl.host);
  headers.set("x-forwarded-proto", isHttps ? "https" : "http");
  headers.set("x-ml-bff", "1");
  headers.set(REQUEST_ID_HEADER, requestId);
  // Node fetch adds `Cache-Control: no-cache` to conditional requests that lack
  // one, which makes Express answer 200 instead of 304 to browser revalidation.
  if (
    !headers.has("cache-control") &&
    (headers.has("if-none-match") || headers.has("if-modified-since"))
  ) {
    headers.set("cache-control", "max-age=0");
  }
  for (const [key, value] of Object.entries(
    bffClientHeaders(req.headers.get("x-forwarded-for"))
  )) {
    headers.set(key, value);
  }

  if (req.signal.aborted) {
    return new NextResponse(null, { status: 499 });
  }

  // Browser cancelled (navigation, video seek) → stop the Express request too.
  // Also aborted by the timeout below.
  const upstreamAbort = new AbortController();
  req.signal.addEventListener("abort", () => upstreamAbort.abort(), { once: true });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  let responded = false;
  const armTimeout = () => {
    if (responded) return;
    timer ??= setTimeout(() => {
      timedOut = true;
      upstreamAbort.abort();
    }, UPSTREAM_TIMEOUT_MS);
  };

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    redirect: "manual",
    signal: upstreamAbort.signal,
  };

  const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body !== null;
  if (hasBody && req.body) {
    // Streamed, never buffered here: Express enforces its own size limits.
    // The timeout starts once the upload is fully sent, so slow uploads are not cut.
    init.body = req.body.pipeThrough(new TransformStream({ flush: armTimeout }));
    init.duplex = "half";
    const contentLength = req.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
  } else {
    armTimeout();
  }

  // Only bodiless idempotent requests can be replayed safely.
  const canRetry = req.method === "GET" || req.method === "HEAD";

  let upstream: Response;
  try {
    try {
      upstream = await fetch(targetUrl, init);
    } catch (err) {
      const code = upstreamErrorCode(err);
      if (!canRetry || upstreamAbort.signal.aborted || !code || !RETRYABLE_ERROR_CODES.has(code)) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      if (upstreamAbort.signal.aborted) throw err;
      upstream = await fetch(targetUrl, init);
    }
  } catch (err) {
    if (req.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    if (timedOut) {
      console.error("[api-proxy] upstream timeout", {
        requestId,
        method: req.method,
        path: logPath,
        timeoutMs: UPSTREAM_TIMEOUT_MS,
      });
      return proxyError(
        504,
        "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
        requestId
      );
    }
    console.error("[api-proxy] upstream unreachable", {
      requestId,
      method: req.method,
      path: logPath,
      code: upstreamErrorCode(err),
      error: err instanceof Error ? err.message : String(err),
    });
    return proxyError(
      502,
      "Service momentanément indisponible. Réessayez dans un instant.",
      requestId
    );
  } finally {
    responded = true;
    clearTimeout(timer);
  }

  const responseHeaders = new Headers();
  const responseConnectionTokens = connectionTokens(upstream.headers);
  upstream.headers.forEach((value: string, key: string) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || responseConnectionTokens.has(lower)) return;
    if (lower === "set-cookie") return;
    responseHeaders.set(key, value);
  });
  responseHeaders.set(REQUEST_ID_HEADER, requestId);
  responseHeaders.set("x-robots-tag", NOINDEX);

  const setCookies = collectUpstreamSetCookies(upstream);
  for (const cookie of setCookies) {
    responseHeaders.append(
      "set-cookie",
      rewriteSetCookieForFrontend(cookie, isHttps)
    );
  }

  // Accept-Encoding is stripped upstream, so bodies arrive uncompressed and the
  // length is exact — keeps progress bars and video byte ranges working.
  const contentLength = upstream.headers.get("content-length");
  if (contentLength && !upstream.headers.get("content-encoding")) {
    responseHeaders.set("content-length", contentLength);
  }

  const hasNoBody =
    req.method === "HEAD" || upstream.status === 204 || upstream.status === 304;

  // Stream instead of buffering: images/videos (and Range 206 responses) flow
  // through without being held in memory.
  return new NextResponse(hasNoBody ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/** Collect every Set-Cookie (Node/undici getSetCookie, or raw fallback). */
function collectUpstreamSetCookies(upstream: Response): string[] {
  const headers = upstream.headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string | string[]>;
  };

  if (typeof headers.getSetCookie === "function") {
    const list = headers.getSetCookie();
    if (list.length > 0) return list;
  }

  const raw = headers.raw?.()?.["set-cookie"];
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (typeof raw === "string" && raw) return [raw];

  const single = upstream.headers.get("set-cookie");
  return single ? [single] : [];
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
