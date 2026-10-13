"use client";

import { io, type Socket } from "socket.io-client";
import { getBaseUrl } from "@/lib/api-config";
import { refreshAuthToken } from "@/lib/api";

/** Bivariant so callers can annotate the payload type of each event. */
export type RealtimeHandler = { bivarianceHack(payload: unknown): void }["bivarianceHack"];

const MAX_AUTH_RETRIES = 3;
/** Keeps the connection alive while one page unmounts and the next one subscribes. */
const RELEASE_DELAY_MS = 1500;

let socket: Socket | null = null;
let subscribers = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let authRetries = 0;
let authRetryTimer: ReturnType<typeof setTimeout> | null = null;
let hasConnected = false;
const resyncListeners = new Set<() => void>();

const isAuthError = (err: Error) => /auth/i.test(err.message);

/**
 * The server rejects the handshake when the access cookie expired; socket.io never retries
 * after a middleware rejection, so refresh the session and reconnect ourselves.
 */
const retryAfterRefresh = () => {
  if (!socket || authRetryTimer || authRetries >= MAX_AUTH_RETRIES) return;
  const delay = 1000 * 2 ** authRetries;
  authRetries += 1;
  authRetryTimer = setTimeout(async () => {
    authRetryTimer = null;
    if (!socket || socket.connected) return;
    const refreshed = await refreshAuthToken();
    if (refreshed.success && socket && !socket.connected) socket.connect();
  }, delay);
};

const reviveIfStale = () => {
  if (!socket || socket.connected || socket.active) return;
  authRetries = 0;
  retryAfterRefresh();
};

const onVisibilityChange = () => {
  if (document.visibilityState === "visible") reviveIfStale();
};

const createSocket = (): Socket => {
  const s = io(getBaseUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    // Fall back to long-polling when a proxy blocks the websocket upgrade.
    tryAllTransports: true,
  });

  s.on("connect", () => {
    authRetries = 0;
    if (hasConnected) resyncListeners.forEach((listener) => listener());
    hasConnected = true;
  });

  s.on("connect_error", (err) => {
    if (!s.active && isAuthError(err)) retryAfterRefresh();
  });

  window.addEventListener("focus", reviveIfStale);
  window.addEventListener("online", reviveIfStale);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return s;
};

const destroySocket = () => {
  if (!socket) return;
  window.removeEventListener("focus", reviveIfStale);
  window.removeEventListener("online", reviveIfStale);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (authRetryTimer) clearTimeout(authRetryTimer);
  authRetryTimer = null;
  authRetries = 0;
  hasConnected = false;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

const acquire = (): Socket => {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  subscribers += 1;
  if (!socket) socket = createSocket();
  return socket;
};

const release = () => {
  subscribers = Math.max(0, subscribers - 1);
  if (subscribers > 0 || releaseTimer) return;
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    if (subscribers === 0) destroySocket();
  }, RELEASE_DELAY_MS);
};

/**
 * Listen to server events on the tab's shared, authenticated socket.
 * `onResync` runs after a reconnection so the caller can refetch what it may have missed.
 */
export const subscribeRealtime = (
  handlers: Record<string, RealtimeHandler>,
  onResync?: () => void
): (() => void) => {
  const s = acquire();
  const entries = Object.entries(handlers);
  entries.forEach(([event, handler]) => s.on(event, handler));
  if (onResync) resyncListeners.add(onResync);

  return () => {
    entries.forEach(([event, handler]) => s.off(event, handler));
    if (onResync) resyncListeners.delete(onResync);
    release();
  };
};
