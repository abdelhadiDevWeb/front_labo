"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";

type ProtectedFileState = {
  url: string | null;
  error: string | null;
  loading: boolean;
};

const IDLE: ProtectedFileState = { url: null, error: null, loading: false };

/**
 * Sensitive uploads (payments, documents) require the session cookie and are
 * served as attachments, so they cannot be framed or linked directly. Load them
 * as a same-origin blob URL instead; it is revoked when `path` changes or on unmount.
 */
export function useProtectedFileUrl(
  path: string | null | undefined,
  type = "application/pdf"
): ProtectedFileState {
  const [state, setState] = useState<ProtectedFileState>(IDLE);

  useEffect(() => {
    if (!path) {
      setState(IDLE);
      return;
    }
    const src = getMediaUrl(path);
    if (!src) {
      setState({ url: null, error: "Document introuvable", loading: false });
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;
    setState({ url: null, error: null, loading: true });

    apiFetch(src, { method: "GET", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type }));
        setState({ url: objectUrl, error: null, loading: false });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("[useProtectedFileUrl]", err);
        setState({
          url: null,
          error: "Impossible de charger le document. Le fichier est peut-être manquant sur le serveur.",
          loading: false,
        });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, type]);

  return state;
}
