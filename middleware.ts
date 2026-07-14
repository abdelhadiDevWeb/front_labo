import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "ml_auth";

/**
 * Soft gate for dashboards: requires first-party ml_auth (set via /api BFF proxy).
 * Onboarding pages are client-guarded only so a missing cookie never traps users
 * on "Vérification de la session".
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
