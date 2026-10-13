"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationData,
} from "@/lib/api";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";
import type { RealtimeHandler } from "@/lib/realtime";

export type RealtimeToastData = {
  key: number;
  title: string;
  message: string;
  href?: string;
};

type FeedEvent = {
  /** Runs before the unread list is reloaded. Return a toast to show it in-app. */
  handle?: (payload: unknown) => Omit<RealtimeToastData, "key"> | void;
};

/**
 * Unread notifications for the logged-in user, kept live through the shared socket.
 * Reloads after every listed socket event, after a reconnection and when the tab
 * becomes visible again (mobile WebViews suspend sockets in the background).
 */
export function useNotificationFeed(enabled: boolean, events: Record<string, FeedEvent>) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<RealtimeToastData | null>(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      const result = await getNotifications(true);
      if (requestId !== requestRef.current) return;
      if (result.success && result.data) {
        setNotifications(result.data.notifications.filter((n) => !n.isRead));
        setUnreadCount(result.data.unreadCount || 0);
      }
    } catch {
      // Keep the current list; the next event or resync retries.
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void reload();
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, reload]);

  const handlers: Record<string, RealtimeHandler> = {};
  for (const [event, config] of Object.entries(events)) {
    handlers[event] = (payload: unknown) => {
      const next = config.handle?.(payload);
      if (next) setToast({ ...next, key: Date.now() });
      void reload();
    };
  }
  useRealtimeEvents(enabled, handlers, () => void reload());

  const markRead = useCallback((id: string) => {
    requestRef.current += 1;
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    void markNotificationAsRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    requestRef.current += 1;
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { notifications, unreadCount, reload, markRead, markAllRead, toast, dismissToast };
}
