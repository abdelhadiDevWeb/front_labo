"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export type DashboardTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Only active on the exact path (dashboard home). */
  exact?: boolean;
};

const THEMES = {
  green: { active: "text-green-700", pill: "bg-green-100", badge: "bg-red-500" },
  blue: { active: "text-blue-700", pill: "bg-blue-100", badge: "bg-red-500" },
} as const;

const isTabActive = (pathname: string, tab: DashboardTab) =>
  tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

/** Phone / tablet tab bar for the supplier and admin dashboards (hidden on lg+, where the sidebar shows). */
export default function DashboardBottomNav({
  tabs,
  onMore,
  moreBadge = 0,
  theme = "green",
}: {
  tabs: DashboardTab[];
  onMore: () => void;
  moreBadge?: number;
  theme?: keyof typeof THEMES;
}) {
  const pathname = usePathname() || "";
  const colors = THEMES[theme];
  const moreActive = !tabs.some((tab) => isTabActive(pathname, tab));

  const itemContent = (Icon: LucideIcon, label: string, active: boolean, badge = 0) => (
    <>
      <span
        className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
          active ? `${colors.pill} ${colors.active}` : "text-gray-500"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        {badge > 0 && (
          <span
            className={`absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full ${colors.badge} px-1 text-[10px] font-bold leading-none text-white`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span
        className={`max-w-full truncate px-0.5 text-[11px] leading-none ${
          active ? `font-semibold ${colors.active}` : "font-medium text-gray-500"
        }`}
      >
        {label}
      </span>
    </>
  );

  return (
    <nav
      aria-label="Navigation du tableau de bord"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-16 max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex h-full flex-col items-center justify-center gap-1 active:bg-gray-50"
              >
                {itemContent(tab.icon, tab.label, active, tab.badge)}
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={onMore}
            className="flex h-full w-full flex-col items-center justify-center gap-1 active:bg-gray-50"
          >
            {itemContent(MoreHorizontal, "Plus", moreActive, moreBadge)}
          </button>
        </li>
      </ul>
    </nav>
  );
}
