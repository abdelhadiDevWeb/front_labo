import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "ml_auth";

/** Routes that require a valid session cookie. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/dashboard-supplier",
  "/suppliers",
  "/favorable",
];

/** Never index these (private app + auth utilities). */
const NOINDEX_PREFIXES = [
  "/dashboard",
  "/dashboard-supplier",
  "/orders",
  "/profile",
  "/favorable",
  "/suppliers",
  "/client",
  "/supplier/choose-subscription",
  "/supplier/upload-documents",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-reset-code",
  "/reset-password",
  "/api",
];

const matchesPrefix = (pathname: string, prefixes: string[]) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  if (matchesPrefix(pathname, NOINDEX_PREFIXES)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard-supplier/:path*",
    "/suppliers",
    "/suppliers/:path*",
    "/favorable",
    "/favorable/:path*",
    "/orders",
    "/orders/:path*",
    "/profile",
    "/profile/:path*",
    "/client/:path*",
    "/supplier/choose-subscription",
    "/supplier/choose-subscription/:path*",
    "/supplier/upload-documents",
    "/supplier/upload-documents/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/verify-reset-code",
    "/reset-password",
    "/api/:path*",
  ],
};
