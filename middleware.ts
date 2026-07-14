import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "ml_auth";

/**
 * Full dashboards / orders require a first-party ml_auth cookie.
 * Onboarding routes are NOT gated here — when the API is cross-origin,
 * HttpOnly cookies live on the API host and this middleware cannot see them.
 * Upload/plan pages use client-side useAuthGuard (credentials to the API).
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/dashboard-supplier",
  "/orders",
  "/profile",
];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  // Only gate protected pages. Never block /login — a stale ml_auth cookie
  // used to redirect login → /home and trap users who need to sign in again.
  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard-supplier/:path*",
    "/orders/:path*",
    "/profile/:path*",
  ],
};
