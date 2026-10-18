"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LayoutGrid, LogOut, X, type LucideIcon } from "lucide-react";
import { getReactNativeWebView } from "@/lib/security";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type DashboardTheme = "green" | "blue";

const THEME: Record<
  DashboardTheme,
  { active: string; activeText: string; tile: string; activeTile: string; header: string }
> = {
  green: {
    active: "bg-green-100 text-green-700",
    activeText: "text-green-700",
    tile: "bg-green-50 text-green-700",
    activeTile: "border-green-300 bg-green-50/70 ring-1 ring-green-200",
    header: "from-green-50 to-emerald-50",
  },
  blue: {
    active: "bg-blue-100 text-blue-700",
    activeText: "text-blue-700",
    tile: "bg-blue-50 text-blue-700",
    activeTile: "border-blue-300 bg-blue-50/70 ring-1 ring-blue-200",
    header: "from-blue-50 to-cyan-50",
  },
};

/** Exact match for the dashboard root, prefix match for sub-sections. */
export const isDashboardPathActive = (pathname: string, href: string, rootHref: string) =>
  href === rootHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/** Longest matching menu item — used for the phone app-bar title on nested routes. */
export const findActiveDashboardItem = <T extends { href: string }>(
  pathname: string,
  items: T[],
  rootHref: string
): T | undefined =>
  items
    .filter((item) => isDashboardPathActive(pathname, item.href, rootHref))
    .sort((a, b) => b.href.length - a.href.length)[0];

const Badge = ({ count }: { count: number }) => (
  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
    {count > 99 ? "99+" : count}
  </span>
);

/**
 * Phone tab bar for the supplier / admin dashboards. Sets `data-lab-nav` on <html> so the
 * shared CSS (`--lab-nav-offset`, body padding, `.app-action-bar`) keeps content clear of it.
 */
export function DashboardBottomNav({
  tabs,
  pathname,
  rootHref,
  theme,
  moreActive,
  moreBadge = 0,
  onMore,
}: {
  tabs: DashboardNavItem[];
  pathname: string;
  rootHref: string;
  theme: DashboardTheme;
  moreActive: boolean;
  moreBadge?: number;
  onMore: () => void;
}) {
  const t = THEME[theme];

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-lab-nav", getReactNativeWebView() ? "app" : "");
    return () => root.removeAttribute("data-lab-nav");
  }, []);

  const tabContent = (Icon: LucideIcon, label: string, active: boolean, badge: number) => (
    <>
      <span
        className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
          active ? t.active : "text-gray-500"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        {badge > 0 && <Badge count={badge} />}
      </span>
      <span
        className={`max-w-full truncate px-0.5 text-[11px] leading-none ${
          active ? `font-semibold ${t.activeText}` : "font-medium text-gray-500"
        }`}
      >
        {label}
      </span>
    </>
  );

  const itemClass =
    "flex h-full w-full flex-col items-center justify-center gap-1 select-none active:scale-95 transition-transform";

  return (
    <nav
      aria-label="Navigation du tableau de bord"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
      style={getReactNativeWebView() ? undefined : { paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-16 max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const active = !moreActive && isDashboardPathActive(pathname, tab.href, rootHref);
          return (
            <li key={tab.href}>
              <Link href={tab.href} className={itemClass} aria-current={active ? "page" : undefined}>
                {tabContent(tab.icon, tab.label, active, tab.badge ?? 0)}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMore} className={itemClass} aria-label="Plus de sections">
            {tabContent(LayoutGrid, "Plus", moreActive, moreBadge)}
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Phone "Plus" sheet: account card, every section as tiles, logout. */
export function DashboardMoreSheet({
  open,
  onClose,
  items,
  pathname,
  rootHref,
  theme,
  account,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  items: DashboardNavItem[];
  pathname: string;
  rootHref: string;
  theme: DashboardTheme;
  account?: ReactNode;
  onLogout: () => void;
}) {
  const t = THEME[theme];
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true" aria-label="Toutes les sections">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-sheet-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className={`shrink-0 bg-gradient-to-r ${t.header}`}>
          <div className="flex justify-center pt-2.5 pb-1">
            <span className="h-1.5 w-10 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center gap-3 px-4 pb-3">
            <div className="min-w-0 flex-1">{account}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-gray-600 active:bg-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="grid grid-cols-3 gap-2.5">
            {items.map(({ href, label, icon: Icon, badge = 0 }) => {
              const active = isDashboardPathActive(pathname, href, rootHref);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center transition-colors active:bg-gray-50 ${
                    active ? t.activeTile : "border-gray-100 bg-white shadow-sm"
                  }`}
                >
                  <span className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${t.tile}`}>
                    <Icon className="h-5 w-5" />
                    {badge > 0 && <Badge count={badge} />}
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-gray-800">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-semibold text-red-600 active:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
