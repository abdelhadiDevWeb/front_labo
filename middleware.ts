import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "ml_auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/dashboard-supplier",
  "/orders",
  "/profile",
  "/client/upload-documents",
  "/client/choose-subscription",
  "/supplier/upload-documents",
  "/supplier/choose-subscription",
];

const AUTH_ONLY_ROUTES = ["/login", "/register", "/forgot-password", "/verify-reset-code", "/reset-password"];

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

  if (AUTH_ONLY_ROUTES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard-supplier/:path*",
    "/orders/:path*",
    "/profile/:path*",
    "/client/upload-documents",
    "/client/choose-subscription",
    "/supplier/upload-documents",
    "/supplier/choose-subscription",
    "/login",
    "/register",
    "/forgot-password",
    "/verify-reset-code",
    "/reset-password",
  ],
};
