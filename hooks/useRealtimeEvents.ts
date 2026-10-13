"use client";

import { useEffect, useRef } from "react";
import { subscribeRealtime, type RealtimeHandler } from "@/lib/realtime";

/**
 * Subscribe to socket events while `enabled`. Handlers may change between renders
 * without re-subscribing; only the set of event names matters.
 */
export function useRealtimeEvents(
  enabled: boolean,
  handlers: Record<string, RealtimeHandler>,
  onResync?: () => void
): void {
  const handlersRef = useRef(handlers);
  const resyncRef = useRef(onResync);

  useEffect(() => {
    handlersRef.current = handlers;
    resyncRef.current = onResync;
  });

  const eventKey = Object.keys(handlers).sort().join("|");

  useEffect(() => {
    if (!enabled || !eventKey) return;
    const proxies: Record<string, RealtimeHandler> = {};
    for (const event of eventKey.split("|")) {
      proxies[event] = (payload: unknown) => handlersRef.current[event]?.(payload);
    }
    return subscribeRealtime(proxies, () => resyncRef.current?.());
  }, [enabled, eventKey]);
}
