"use client";

import { useEffect } from "react";

const RELOAD_KEY = "ml_chunk_reload";

const isChunkLoadFailure = (message: string): boolean =>
  /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module/i.test(
    message
  );

/**
 * After a new deploy, cached HTML may reference old hashed chunks (404).
 * One automatic reload usually fixes it on Hostinger.
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    const tryReload = (message: string) => {
      if (!isChunkLoadFailure(message)) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      tryReload(event.message || "");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      tryReload(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
