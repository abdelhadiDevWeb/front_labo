"use client";

/**
 * System notification when the tab is in the background.
 * `new Notification()` throws on Android Chrome / WebViews, so failures are ignored
 * (the in-app toast and the bell badge still show the event).
 */
export const showBrowserNotification = (title: string, body: string): void => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  try {
    new window.Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // Unsupported constructor (mobile) — ignore.
  }
};
