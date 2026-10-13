"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, X } from "lucide-react";
import type { NotificationData } from "@/lib/api";
import type { RealtimeToastData } from "@/hooks/useNotificationFeed";

export type NotificationVisual = {
  title: string;
  icon: ReactNode;
  /** Background classes for the icon tile, e.g. `bg-gradient-to-br from-blue-600 to-cyan-600`. */
  iconClassName: string;
};

type Theme = "blue" | "green";

const THEME: Record<Theme, { header: string; subtitle: string; unread: string; dot: string }> = {
  blue: {
    header: "bg-gradient-to-r from-blue-600 to-cyan-600",
    subtitle: "text-blue-100",
    unread: "bg-blue-50/70",
    dot: "bg-blue-500",
  },
  green: {
    header: "bg-gradient-to-r from-green-600 to-emerald-600",
    subtitle: "text-green-100",
    unread: "bg-green-50/70",
    dot: "bg-green-500",
  },
};

const MOBILE_QUERY = "(max-width: 639.98px)";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isMobile;
};

export const formatNotificationTime = (iso: string): string => {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (!Number.isFinite(diffMin)) return "";
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type PanelProps = {
  open: boolean;
  onClose: () => void;
  /** The bell button; the desktop dropdown is placed under it. */
  anchorRef: RefObject<HTMLElement | null>;
  notifications: NotificationData[];
  unreadCount: number;
  onItemClick: (notification: NotificationData) => void;
  onMarkAllRead: () => void;
  describe: (notification: NotificationData) => NotificationVisual;
  theme?: Theme;
  showSender?: boolean;
};

/**
 * Notification list rendered in a portal (headers with `backdrop-filter` would otherwise trap
 * `fixed` children): bottom sheet on phones, dropdown under the bell on larger screens.
 * Only the list scrolls; the page behind stays still on phones.
 */
export default function NotificationPanel({
  open,
  onClose,
  anchorRef,
  notifications,
  unreadCount,
  onItemClick,
  onMarkAllRead,
  describe,
  theme = "blue",
  showSender = false,
}: PanelProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const isMobile = useIsMobile();
  const colors = THEME[theme];

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || isMobile) return;
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open, isMobile, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isMobile]);

  if (!mounted || !open) return null;

  const panelStyle = isMobile
    ? { paddingBottom: "env(safe-area-inset-bottom)" }
    : position
      ? { top: position.top, right: position.right }
      : { visibility: "hidden" as const };

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[200] ${isMobile ? "bg-black/40 animate-fade-in" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Notifications"
        style={panelStyle}
        className={`fixed z-[201] flex flex-col overflow-hidden bg-white shadow-2xl border border-gray-200 ${
          isMobile
            ? "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl"
            : "w-96 max-w-[calc(100vw-1rem)] max-h-[min(34rem,calc(100dvh-6rem))] rounded-2xl"
        }`}
      >
        <div className={`shrink-0 ${colors.header} text-white px-4 pb-3 ${isMobile ? "pt-2" : "pt-3"}`}>
          {isMobile && <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/40" />}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg">Notifications</h3>
              <p className={`text-xs sm:text-sm ${colors.subtitle}`}>
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Aucune nouvelle notification"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/30 transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Tout lire</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-white/20 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">
              <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="font-medium text-sm">Vous êtes à jour</p>
              <p className="mt-1 text-xs text-gray-400">Les nouvelles notifications apparaîtront ici.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const visual = describe(notification);
                const sender =
                  showSender && notification.idSender && typeof notification.idSender === "object"
                    ? `${notification.idSender.firstName || ""} ${notification.idSender.lastName || ""}`.trim()
                    : "";
                return (
                  <li key={notification._id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 ${
                        notification.isRead ? "" : colors.unread
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${visual.iconClassName}`}
                      >
                        {visual.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">{visual.title}</span>
                          <span className="shrink-0 text-[11px] text-gray-400 mt-0.5">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </span>
                        {sender && <span className="block text-xs text-gray-500">De : {sender}</span>}
                        <span className="mt-1 block text-sm text-gray-600 break-words">
                          {notification.message}
                        </span>
                      </span>
                      {!notification.isRead && (
                        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

type ToastProps = {
  toast: RealtimeToastData | null;
  onDismiss: () => void;
  onOpen?: (toast: RealtimeToastData) => void;
  theme?: Theme;
  /** Extra bottom offset on phones (e.g. above a bottom tab bar). */
  mobileBottomClassName?: string;
};

const TOAST_MS = 6000;

/** Short-lived in-app banner for a realtime event (works where system notifications don't). */
export function RealtimeToast({
  toast,
  onDismiss,
  onOpen,
  theme = "blue",
  mobileBottomClassName = "bottom-4",
}: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const dismissRef = useRef(onDismiss);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismissRef.current(), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!mounted || !toast) return null;

  return createPortal(
    <div
      key={toast.key}
      role="status"
      aria-live="polite"
      className={`fixed inset-x-3 ${mobileBottomClassName} z-[190] sm:inset-x-auto sm:bottom-auto sm:top-20 sm:right-4 sm:w-96 animate-fade-in-up`}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${THEME[theme].header}`}
        >
          <Bell className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={() => {
            onOpen?.(toast);
            onDismiss();
          }}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-sm font-semibold text-gray-900">{toast.title}</span>
          <span className="mt-0.5 block text-sm text-gray-600 break-words line-clamp-3">{toast.message}</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}
