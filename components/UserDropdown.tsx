"use client";

import {
  LogOut,
  UserCircle,
  ChevronDown,
  ChevronRight,
  BarChart3,
  ClipboardList,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { performLogout } from "@/lib/perform-logout";

interface UserDropdownProps {
  userEmail?: string;
}

type MenuItem = { label: string; href: string; icon: LucideIcon; tile: string };

const MENU_ITEMS: MenuItem[] = [
  { label: "Mon profil", href: "/profile", icon: UserCircle, tile: "bg-blue-50 text-blue-600" },
  { label: "Mes réserves", href: "/orders", icon: ClipboardList, tile: "bg-cyan-50 text-cyan-700" },
  { label: "Statistiques", href: "/statistics", icon: BarChart3, tile: "bg-indigo-50 text-indigo-600" },
  { label: "Favoris", href: "/favorable", icon: Heart, tile: "bg-rose-50 text-rose-500" },
];

const initialOf = (email?: string) => (email?.trim()?.[0] || "U").toUpperCase();

export default function UserDropdown({ userEmail }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initial = initialOf(userEmail);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target) || sheetRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  // Lock page scroll while the phone sheet is open.
  useEffect(() => {
    if (!isOpen || !window.matchMedia("(max-width: 639.98px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const go = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await performLogout(router, { clearCart: true, redirectTo: "/home" });
  };

  const avatar = (size: "sm" | "lg") => (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 font-bold text-white shadow-md ${
        size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm"
      }`}
    >
      {initial}
    </span>
  );

  const header = (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-50 to-cyan-50">
      {avatar("lg")}
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">Connecté en tant que</p>
        <p className="truncate text-sm font-semibold text-gray-900">{userEmail || "Mon compte"}</p>
      </div>
    </div>
  );

  const items = (
    <div className="py-1.5">
      {MENU_ITEMS.map(({ label, href, icon: Icon, tile }) => (
        <button
          key={href}
          type="button"
          onClick={() => go(href)}
          className="group flex w-full min-h-12 items-center gap-3 px-4 py-2 text-left transition-colors active:bg-gray-100 sm:hover:bg-gray-50"
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tile}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
          <ChevronRight className="h-4 w-4 text-gray-300 transition-transform sm:group-hover:translate-x-0.5" />
        </button>
      ))}
    </div>
  );

  const logout = (
    <div className="border-t border-gray-100 p-2">
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors active:bg-red-100 sm:hover:bg-red-100"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </button>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Menu du compte"
        aria-expanded={isOpen}
        className="flex min-h-11 items-center gap-1.5 rounded-xl p-1 sm:p-1.5 transition-colors active:bg-gray-100 sm:hover:bg-gray-100"
      >
        {avatar("sm")}
        <ChevronDown
          className={`hidden sm:block h-4 w-4 text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Desktop / tablet dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 hidden w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-fade-in-up z-50 sm:block">
          {header}
          {items}
          {logout}
        </div>
      )}

      {/* Phone bottom sheet */}
      {isOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[70] sm:hidden" role="dialog" aria-modal="true" aria-label="Mon compte">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={sheetRef}
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-sheet-up"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex justify-center pt-2.5 pb-1 bg-gradient-to-r from-blue-50 to-cyan-50">
                <span className="h-1.5 w-10 rounded-full bg-gray-300" />
              </div>
              {header}
              {items}
              {logout}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
