"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LayoutGrid, LogOut, X, type LucideIcon } from "lucide-react";
import { getReactNativeWebView } from "@/lib/security";

export type DashboardNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  /** Short label for the tab bar (defaults to `label`). */
  shortLabel?: string;
  badge?: number;
};

type Theme = "green" | "blue";

const THEMES: Record<Theme, { active: string; pill: string; tile: string; gradient: string }> = {
  green: {
    active: "text-green-700",
    pill: "bg-green-100 text-green-700",
    tile: "bg-green-50 text-green-700",
    gradient: "from-green-50 to-emerald-50",
  },
  blue: {
    active: "text-blue-700",
    pill: "bg-blue-100 text-blue-700",
    tile: "bg-blue-50 text-blue-700",
    gradient: "from-blue-50 to-cyan-50",
  },
};

/** Root dashboard href matches only itself; other items also match their sub-routes. */
const isActiveHref = (pathname: string, href: string, rootHref: string) =>
  href === rootHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function Badge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Phone / tablet tab bar for the supplier and admin dashboards (hidden on lg+, where the sidebar shows).
 * Sets `data-dash-nav` on <html> so pages can clear it via `--dash-nav-offset`.
 */
export default function DashboardBottomNav({
  pathname,
  rootHref,
  primary,
  more,
  theme,
  onLogout,
}: {
  pathname: string;
  rootHref: string;
  primary: DashboardNavItem[];
  more: DashboardNavItem[];
  theme: Theme;
  onLogout: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inApp, setInApp] = useState(false);
  const t = THEMES[theme];
  const moreActive = more.some((item) => isActiveHref(pathname, item.href, rootHref));
  const moreBadge = more.reduce((sum, item) => sum + (item.badge || 0), 0);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  useEffect(() => {
    setMounted(true);
    setInApp(Boolean(getReactNativeWebView()));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-dash-nav", inApp ? "app" : "");
    return () => root.removeAttribute("data-dash-nav");
  }, [inApp]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const tabClass = "relative flex h-full flex-col items-center justify-center gap-1";
  const iconWrap = (active: boolean) =>
    `relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
      active ? t.pill : "text-gray-500"
    }`;
  const labelClass = (active: boolean) =>
    `max-w-full truncate px-0.5 text-[11px] leading-none ${
      active ? `font-semibold ${t.active}` : "font-medium text-gray-500"
    }`;

  return (
    <>
      <nav
        aria-label="Navigation du tableau de bord"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden"
        style={inApp ? undefined : { paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid h-16 max-w-xl" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map(({ icon: Icon, label, shortLabel, href, badge }) => {
            const active = isActiveHref(pathname, href, rootHref);
            return (
              <li key={href} className="min-w-0">
                <Link href={href} className={tabClass} aria-current={active ? "page" : undefined}>
                  <span className={iconWrap(active)}>
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                    <Badge count={badge} />
                  </span>
                  <span className={labelClass(active)}>{shortLabel || label}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`${tabClass} w-full`}
              aria-expanded={moreOpen}
              aria-label="Plus de sections"
            >
              <span className={iconWrap(moreActive || moreOpen)}>
                <LayoutGrid className="h-5 w-5" strokeWidth={moreActive ? 2.4 : 2} />
                <Badge count={moreBadge} />
              </span>
              <span className={labelClass(moreActive || moreOpen)}>Plus</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-label="Plus de sections">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={() => setMoreOpen(false)} />
            <div
              className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-sheet-up"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className={`sticky top-0 flex items-center justify-between bg-gradient-to-r ${t.gradient} px-4 pb-3 pt-2.5`}>
                <span className="absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-gray-300" />
                <h2 className="mt-2 text-base font-bold text-gray-900">Toutes les sections</h2>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Fermer"
                  className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 active:bg-white/70"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5 p-4">
                {more.map(({ icon: Icon, label, href, badge }) => {
                  const active = isActiveHref(pathname, href, rootHref);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl border px-1.5 py-3.5 text-center active:bg-gray-50 ${
                        active ? "border-transparent ring-2 ring-offset-1 ring-current " + t.active : "border-gray-100 shadow-sm"
                      }`}
                    >
                      <span className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${t.tile}`}>
                        <Icon className="h-5 w-5" />
                        <Badge count={badge} />
                      </span>
                      <span className="text-xs font-semibold leading-tight text-gray-800">{label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="border-t border-gray-100 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onLogoutRef.current();
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
        )}
    </>
  );
}
