"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { getPromotionAlert, PROMOTIONS_SEEN_EVENT } from "@/lib/api";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Heart,
  Home,
  Info,
  LogIn,
  LogOut,
  Mail,
  Megaphone,
  Microscope,
  Package,
  Percent,
  Radio,
  ShoppingCart,
  UserCircle,
  UserPlus,
  Users,
  X,
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
    href: "/allthings",
    label: "Tout le catalogue",
    icon: Package,
    hoverClass: "hover:bg-slate-50 hover:text-slate-700",
  },
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
    label: "Toutes les publicités",
    icon: Megaphone,
    hoverClass: "hover:bg-purple-50 hover:text-purple-600",
  },
  {
    href: "/products/promotions",
    label: "Toutes les promotions",
    icon: Percent,
    hoverClass: "hover:bg-orange-50 hover:text-orange-600",
  },
  {
    href: "/products/group-sales",
    label: "Ventes groupées",
    icon: Users,
    hoverClass: "hover:bg-teal-50 hover:text-teal-700",
  },
];

const LIVE_HREF = "/live";
const PROMOTIONS_HREF = "/products/promotions";

/** Desktop and mobile menus mount together — share one request. */
let promotionAlertRequest: Promise<boolean> | null = null;

const fetchHasNewPromotions = (): Promise<boolean> => {
  promotionAlertRequest ??= getPromotionAlert()
    .then((result) => Boolean(result.success && result.data?.hasNew))
    .catch(() => false)
    .finally(() => {
      promotionAlertRequest = null;
    });
  return promotionAlertRequest;
};

function useNewPromotionsAlert(enabled: boolean): boolean {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHasNew(false);
      return;
    }
    let cancelled = false;
    let seen = false;
    void fetchHasNewPromotions().then((value) => {
      if (!cancelled && !seen) setHasNew(value);
    });
    const onSeen = () => {
      seen = true;
      setHasNew(false);
    };
    window.addEventListener(PROMOTIONS_SEEN_EVENT, onSeen);
    return () => {
      cancelled = true;
      window.removeEventListener(PROMOTIONS_SEEN_EVENT, onSeen);
    };
  }, [enabled]);

  return hasNew;
}

function AlertDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-white ${className}`}
      aria-hidden
    />
  );
}

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
  alertHref,
}: {
  label: string;
  items: HeaderMenuLink[];
  /** Item flagged with a red dot (the menu label gets one too). */
  alertHref?: string;
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
        aria-label={alertHref ? `${label} — nouvelles promotions` : undefined}
      >
        <span className="relative">
          {label}
          <span
            className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${
              open ? "w-full" : "w-0"
            }`}
          />
          {alertHref ? <AlertDot className="absolute -top-1.5 -right-2.5" /> : null}
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
                  {item.href === alertHref ? (
                    <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-600">
                      Nouveau
                      <AlertDot />
                    </span>
                  ) : null}
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
  promotionAlert = false,
}: {
  showSuppliers?: boolean;
  /** Logged-in lab: flag promotions published since the last visit. */
  promotionAlert?: boolean;
}) {
  const hasNewPromotions = useNewPromotionsAlert(promotionAlert);

  return (
    <>
      <HeaderHoverMenu
        label="Marketplace"
        items={MARKETPLACE_MENU}
        alertHref={hasNewPromotions ? PROMOTIONS_HREF : undefined}
      />
      {showSuppliers ? (
        <HeaderHoverMenu label="Fournisseurs" items={SUPPLIERS_MENU} />
      ) : null}
      <Link
        href={LIVE_HREF}
        className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group flex items-center gap-1.5"
      >
        Live
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
      </Link>
    </>
  );
}

const TILE_TONES: Record<string, string> = {
  "/allthings": "bg-slate-100 text-slate-700",
  "/products": "bg-blue-50 text-blue-600",
  "/machines": "bg-cyan-50 text-cyan-700",
  "/services": "bg-amber-50 text-amber-700",
  "/products/sponsored": "bg-purple-50 text-purple-600",
  "/products/promotions": "bg-orange-50 text-orange-600",
  "/products/group-sales": "bg-teal-50 text-teal-700",
  "/suppliers": "bg-blue-50 text-blue-600",
  "/favorable": "bg-rose-50 text-rose-500",
};

const SHORT_LABELS: Record<string, string> = {
  "/allthings": "Catalogue",
  "/products": "Produits",
  "/machines": "Machines",
  "/services": "Services",
  "/products/sponsored": "Publicités",
  "/products/promotions": "Promotions",
  "/products/group-sales": "Ventes groupées",
};

function DrawerRow({
  href,
  label,
  icon: Icon,
  tone,
  onNavigate,
  trailing,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  onNavigate: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 active:bg-gray-100"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
      {trailing ?? <ChevronRight className="h-4 w-4 text-gray-300" />}
    </Link>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-4 pt-4">
      <h3 className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Phone: slide-in drawer opened by the header "☰" button. */
export function MobileNavDrawer({
  open,
  onClose,
  isLab = false,
  userEmail,
  cartCount = 0,
  homeHref = "/home",
  onOpenCart,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  /** Logged-in lab (client) account. */
  isLab?: boolean;
  userEmail?: string;
  cartCount?: number;
  homeHref?: string;
  onOpenCart?: () => void;
  onLogout?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const hasNewPromotions = useNewPromotionsAlert(isLab);
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

  const initial = (userEmail?.trim()?.[0] || "U").toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <aside
        className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl animate-drawer-in"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <Link href={homeHref} onClick={onClose} className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="Dz Labmarket"
              width={274}
              height={200}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 active:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {isLab && (
            <div className="px-4 pt-4">
              <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-base font-bold text-white shadow-md">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Connecté en tant que</p>
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {userEmail || "Mon compte"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCart?.();
                  }}
                  className="relative flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-white py-2.5 text-xs font-semibold text-gray-700 shadow-sm active:bg-gray-50"
                >
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  Panier
                  {cartCount > 0 && (
                    <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
                <Link
                  href="/orders"
                  onClick={onClose}
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-white py-2.5 text-xs font-semibold text-gray-700 shadow-sm active:bg-gray-50"
                >
                  <ClipboardList className="h-5 w-5 text-cyan-700" />
                  Réserves
                </Link>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-white py-2.5 text-xs font-semibold text-gray-700 shadow-sm active:bg-gray-50"
                >
                  <UserCircle className="h-5 w-5 text-indigo-600" />
                  Profil
                </Link>
              </div>
            </div>
          )}

          <DrawerSection title="Navigation">
            <DrawerRow href={homeHref} label="Accueil" icon={Home} tone="bg-blue-50 text-blue-600" onNavigate={onClose} />
            {isLab ? (
              <DrawerRow
                href="/statistics"
                label="Statistiques"
                icon={BarChart3}
                tone="bg-indigo-50 text-indigo-600"
                onNavigate={onClose}
              />
            ) : (
              <>
                <DrawerRow href="/about" label="À propos" icon={Info} tone="bg-sky-50 text-sky-600" onNavigate={onClose} />
                <DrawerRow href="/contact" label="Contact" icon={Mail} tone="bg-emerald-50 text-emerald-600" onNavigate={onClose} />
              </>
            )}
            <DrawerRow
              href={LIVE_HREF}
              label="Live"
              icon={Radio}
              tone="bg-red-50 text-red-500"
              onNavigate={onClose}
              trailing={
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live
                </span>
              }
            />
          </DrawerSection>

          <DrawerSection title="Marketplace">
            <div className="grid grid-cols-3 gap-2 px-1">
              {MARKETPLACE_MENU.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-gray-100 bg-white px-1 py-3 text-center shadow-sm active:bg-gray-50"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TILE_TONES[href] ?? "bg-gray-100 text-gray-600"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-gray-700">
                    {SHORT_LABELS[href] ?? label}
                  </span>
                  {hasNewPromotions && href === PROMOTIONS_HREF && (
                    <AlertDot className="absolute right-2 top-2" />
                  )}
                </Link>
              ))}
            </div>
          </DrawerSection>

          {isLab && (
            <DrawerSection title="Fournisseurs">
              {SUPPLIERS_MENU.map(({ href, label, icon }) => (
                <DrawerRow
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  tone={TILE_TONES[href] ?? "bg-gray-100 text-gray-600"}
                  onNavigate={onClose}
                />
              ))}
            </DrawerSection>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 p-3">
          {isLab ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout?.();
              }}
              className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-semibold text-red-600 active:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/register"
                onClick={onClose}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-blue-600 text-sm font-semibold text-blue-700 active:bg-blue-50"
              >
                <UserPlus className="h-4 w-4" />
                Créer un compte
              </Link>
              <Link
                href="/login"
                onClick={onClose}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-md active:opacity-90"
              >
                <LogIn className="h-4 w-4" />
                Connexion
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}

/** Mobile accordion for the same menus */
export function HomeMobileNavMenus({
  onNavigate,
  showSuppliers = false,
  promotionAlert = false,
}: {
  onNavigate?: () => void;
  showSuppliers?: boolean;
  promotionAlert?: boolean;
}) {
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const hasNewPromotions = useNewPromotionsAlert(promotionAlert);

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
          {hasNewPromotions && item.href === PROMOTIONS_HREF ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              Nouveau
              <AlertDot />
            </span>
          ) : null}
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
        <span className="relative">
          Marketplace
          {hasNewPromotions ? <AlertDot className="absolute -top-1 -right-3" /> : null}
        </span>
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

      <Link
        href={LIVE_HREF}
        onClick={() => onNavigate?.()}
        className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center gap-2"
      >
        Live
      </Link>
    </>
  );
}
