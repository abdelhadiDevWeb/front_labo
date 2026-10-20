import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "ml_auth";

/** Routes that require a valid session cookie. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/dashboard-supplier",
  "/suppliers",
  "/favorable",
  "/statistics",
  "/orders",
  "/profile",
];

/** Never index these (private app + auth utilities). */
const NOINDEX_PREFIXES = [
  "/dashboard",
  "/dashboard-supplier",
  "/orders",
  "/statistics",
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

  // Private spaces must never be served from the browser cache / back-forward cache:
  // after logout, "Back" then hits this middleware again and redirects to /login.
  if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
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
    "/statistics",
    "/statistics/:path*",
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
    // Not /api: running middleware there makes Next buffer every request body
    // (uploads included) in memory. The API proxy sets X-Robots-Tag itself.
  ],
};
