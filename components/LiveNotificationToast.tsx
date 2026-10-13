"use client";

import { useEffect } from "react";
import { Bell, X } from "lucide-react";

export type LiveToast = {
  id: number;
  title: string;
  message: string;
  tone?: "blue" | "green" | "amber";
  href?: string;
};

const TONES: Record<NonNullable<LiveToast["tone"]>, string> = {
  blue: "from-blue-600 to-cyan-600",
  green: "from-green-600 to-emerald-600",
  amber: "from-amber-500 to-orange-600",
};

type Props = {
  toast: LiveToast | null;
  onClose: () => void;
  onOpen?: (toast: LiveToast) => void;
  durationMs?: number;
};

/** Short in-page banner for realtime events while the tab is visible. */
export default function LiveNotificationToast({ toast, onClose, onOpen, durationMs = 6000 }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [toast, onClose, durationMs]);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="fixed left-3 right-3 top-3 z-[120] sm:left-auto sm:right-4 sm:top-4 sm:w-96 animate-slide-up"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl">
        <button
          type="button"
          onClick={() => {
            onOpen?.(toast);
            onClose();
          }}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${TONES[toast.tone || "blue"]} flex items-center justify-center`}
          >
            <Bell className="w-4 h-4 text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">{toast.title}</span>
            <span className="mt-0.5 block text-sm text-gray-600 break-words line-clamp-3">
              {toast.message}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
