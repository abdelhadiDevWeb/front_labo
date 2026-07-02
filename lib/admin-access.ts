export const SOU_ADMIN_MENU_HREFS = [
  "/dashboard",
  "/dashboard/orders",
  "/dashboard/users",
  "/dashboard/problems",
] as const;

export function isSouAdminRole(role: string | null | undefined): boolean {
  return role === "sou-admin";
}

export function isPathAllowedForSouAdmin(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  return SOU_ADMIN_MENU_HREFS.some(
    (href) =>
      href !== "/dashboard" && (pathname === href || pathname.startsWith(`${href}/`))
  );
}
