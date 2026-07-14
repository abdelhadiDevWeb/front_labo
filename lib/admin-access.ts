/** Paths sou-admin may open in the admin dashboard (URL + menu). */
export const SOU_ADMIN_MENU_HREFS = [
  "/dashboard",
  "/dashboard/statistics",
  "/dashboard/profile",
] as const;

export function isSouAdminRole(role: string | null | undefined): boolean {
  return role === "sou-admin";
}

export function isPathAllowedForSouAdmin(pathname: string): boolean {
  if (!pathname) return false;
  return SOU_ADMIN_MENU_HREFS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}
