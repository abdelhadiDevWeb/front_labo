"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  FlaskConical,
  Heart,
  Megaphone,
  Microscope,
  Package,
  Percent,
  type LucideIcon,
} from "lucide-react";

type HeaderMenuLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  hoverClass: string;
};

/** Stable marketplace links — keep out of home/page.tsx so HMR cannot remount an old flat nav. */
export const MARKETPLACE_MENU: HeaderMenuLink[] = [
  {
    href: "/products",
    label: "Tous les produits",
    icon: Package,
    hoverClass: "hover:bg-blue-50 hover:text-blue-600",
  },
  {
    href: "/machines",
    label: "Toutes les machines",
    icon: Microscope,
    hoverClass: "hover:bg-cyan-50 hover:text-cyan-700",
  },
  {
    href: "/services",
    label: "Tous les services",
    icon: FlaskConical,
    hoverClass: "hover:bg-amber-50 hover:text-amber-700",
  },
  {
    href: "/products/sponsored",
    label: "Tous les sponsors",
    icon: Megaphone,
    hoverClass: "hover:bg-purple-50 hover:text-purple-600",
  },
  {
    href: "/products/promotions",
    label: "Toutes les promotions",
    icon: Percent,
    hoverClass: "hover:bg-orange-50 hover:text-orange-600",
  },
];

export const SUPPLIERS_MENU: HeaderMenuLink[] = [
  {
    href: "/suppliers",
    label: "Tous les fournisseurs",
    icon: Building2,
    hoverClass: "hover:bg-blue-50 hover:text-blue-600",
  },
  {
    href: "/favorable",
    label: "Favoris",
    icon: Heart,
    hoverClass: "hover:bg-rose-50 hover:text-rose-600",
  },
];

function HeaderHoverMenu({
  label,
  items,
}: {
  label: string;
  items: HeaderMenuLink[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={`flex items-center gap-1 transition-all duration-200 font-medium text-sm uppercase tracking-wide ${
          open ? "text-blue-600" : "text-gray-700"
        }`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="relative">
          {label}
          <span
            className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${
              open ? "w-full" : "w-0"
            }`}
          />
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="min-w-[240px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors ${item.hoverClass}`}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Desktop: Marketplace + optional Fournisseurs (parent waits for auth first). */
export function HomeDesktopNavMenus({
  showSuppliers = false,
}: {
  showSuppliers?: boolean;
}) {
  return (
    <>
      <HeaderHoverMenu label="Marketplace" items={MARKETPLACE_MENU} />
      {showSuppliers ? (
        <HeaderHoverMenu label="Fournisseurs" items={SUPPLIERS_MENU} />
      ) : null}
    </>
  );
}

/** Mobile accordion for the same menus */
export function HomeMobileNavMenus({
  onNavigate,
  showSuppliers = false,
}: {
  onNavigate?: () => void;
  showSuppliers?: boolean;
}) {
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);

  const renderLinks = (items: HeaderMenuLink[], close: () => void) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          onClick={() => {
            close();
            onNavigate?.();
          }}
          className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center gap-2"
        >
          <Icon className="w-4 h-4" />
          {item.label}
        </Link>
      );
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setMarketplaceOpen((open) => !open)}
        className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center justify-between"
        aria-expanded={marketplaceOpen}
      >
        <span>Marketplace</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            marketplaceOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {marketplaceOpen && (
        <div className="ml-3 flex flex-col gap-1 border-l border-gray-200 pl-3">
          {renderLinks(MARKETPLACE_MENU, () => setMarketplaceOpen(false))}
        </div>
      )}

      {showSuppliers && (
        <>
          <button
            type="button"
            onClick={() => setSuppliersOpen((open) => !open)}
            className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center justify-between"
            aria-expanded={suppliersOpen}
          >
            <span>Fournisseurs</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                suppliersOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {suppliersOpen && (
            <div className="ml-3 flex flex-col gap-1 border-l border-gray-200 pl-3">
              {renderLinks(SUPPLIERS_MENU, () => setSuppliersOpen(false))}
            </div>
          )}
        </>
      )}
    </>
  );
}
