"use client";

import { saveFcmToken } from "@/lib/api";
import {
  getReactNativeWebView,
  isAllowedPostMessageOrigin,
  postMessageToNative,
} from "@/lib/security";

/**
 * Bridge React Native WebView FCM tokens → backend for any logged-in role.
 * Returns a cleanup function.
 */
export function setupNativeFcmBridge(options?: {
  enabled?: boolean;
}): () => void {
  const enabled = options?.enabled !== false;

  if (typeof window === "undefined" || !getReactNativeWebView() || !enabled) {
    return () => {};
  }

  let savedToken: string | null = null;

  const requestFcmToken = () => {
    postMessageToNative({ type: "REQUEST_FCM_TOKEN" });
  };

  const handleToken = async (token: string) => {
    if (!token || token === savedToken) return;
    try {
      const result = await saveFcmToken(token);
      if (result.success) {
        savedToken = token;
      }
    } catch {
      // ignore — will retry on next request
    }
  };

  const onMessage = (event: Event) => {
    const messageEvent = event as MessageEvent;
    const origin =
      typeof messageEvent.origin === "string" ? messageEvent.origin : "";
    if (!isAllowedPostMessageOrigin(origin)) return;

    void (async () => {
      try {
        const raw = messageEvent.data;
        const message = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (message?.type === "FCM_TOKEN" && typeof message.token === "string") {
          await handleToken(message.token);
        }
      } catch {
        // ignore malformed messages
      }
    })();
  };

  requestFcmToken();
  const interval = window.setInterval(requestFcmToken, 300_000);
  window.addEventListener("message", onMessage);
  // React Native WebView may dispatch on document as well as window
  document.addEventListener("message", onMessage);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("message", onMessage);
    document.removeEventListener("message", onMessage);
  };
}
