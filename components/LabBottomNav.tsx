"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import CartPanel from "@/components/CartPanel";
import { useCart } from "@/contexts/CartContext";
import { getSessionRole } from "@/lib/api";
import { hasAuthSessionHint } from "@/lib/auth-session";

/** Lab (client) pages where the phone tab bar is shown. */
const LAB_PATH_PREFIXES = [
  "/home",
  "/orders",
  "/profile",
  "/favorable",
  "/suppliers",
  "/supplier/",
  "/allthings",
  "/products",
  "/machines",
  "/services",
  "/categories",
  "/live",
  "/about",
  "/contact",
];

const CATALOG_PREFIXES = ["/allthings", "/products", "/machines", "/services", "/categories"];

const matchesPrefix = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) =>
    prefix.endsWith("/")
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

type Tab = {
  key: string;
  label: string;
  icon: typeof Home;
  href?: string;
  isActive: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  { key: "home", label: "Accueil", icon: Home, href: "/home", isActive: (p) => p === "/home" },
  {
    key: "catalog",
    label: "Catalogue",
    icon: LayoutGrid,
    href: "/allthings",
    isActive: (p) => matchesPrefix(p, CATALOG_PREFIXES),
  },
  {
    key: "orders",
    label: "Réserves",
    icon: ClipboardList,
    href: "/orders",
    isActive: (p) => matchesPrefix(p, ["/orders"]),
  },
  { key: "cart", label: "Panier", icon: ShoppingCart, isActive: () => false },
  {
    key: "profile",
    label: "Profil",
    icon: User,
    href: "/profile",
    isActive: (p) => matchesPrefix(p, ["/profile", "/favorable"]),
  },
];

export default function LabBottomNav() {
  const pathname = usePathname() || "";
  const { getTotalItems } = useCart();
  const [isLab, setIsLab] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const roleCheckedRef = useRef(false);

  const onLabPage = matchesPrefix(pathname, LAB_PATH_PREFIXES);

  useEffect(() => {
    if (!onLabPage) return;
    if (!hasAuthSessionHint()) {
      roleCheckedRef.current = false;
      setIsLab(false);
      return;
    }
    if (roleCheckedRef.current) return;
    roleCheckedRef.current = true;
    void getSessionRole().then((session) => setIsLab(session?.role === "client"));
  }, [onLabPage, pathname]);

  const visible = onLabPage && isLab;

  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.setAttribute("data-lab-nav", "");
    else root.removeAttribute("data-lab-nav");
    return () => root.removeAttribute("data-lab-nav");
  }, [visible]);

  useEffect(() => {
    setCartOpen(false);
  }, [pathname]);

  if (!visible) return null;

  const cartCount = getTotalItems();

  return (
    <>
      <nav
        aria-label="Navigation laboratoire"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === "cart" ? cartOpen : tab.isActive(pathname);
            const content = (
              <>
                <span
                  className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-blue-100 text-blue-700" : "text-gray-500"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {tab.key === "cart" && cartCount > 0 && (
                    <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    active ? "font-semibold text-blue-700" : "font-medium text-gray-500"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            );
            const itemClass =
              "flex h-full w-full flex-col items-center justify-center gap-1 select-none active:scale-95 transition-transform";

            return (
              <li key={tab.key}>
                {tab.href ? (
                  <Link
                    href={tab.href}
                    className={itemClass}
                    aria-current={active ? "page" : undefined}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className={itemClass}
                    aria-label={`Panier${cartCount ? ` (${cartCount})` : ""}`}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
