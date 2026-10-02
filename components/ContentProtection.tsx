"use client";

import { useEffect } from "react";
import { postMessageToNative } from "@/lib/security";

const PROTECTED_HTML_CLASS = "content-protected";
const BLOCKED_SHORTCUT_KEYS = new Set(["c", "x", "a", "s", "p"]);
const EDITABLE_KEYS = new Set(["c", "x", "a"]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * Catalog protection: blocks copy / selection / context menu and asks the
 * mobile app (WebView) to block screenshots while mounted.
 */
export default function ContentProtection() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(PROTECTED_HTML_CLASS);

    const block = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const blockCopy = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      event.clipboardData?.setData("text/plain", "");
    };

    const blockShortcuts = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (!BLOCKED_SHORTCUT_KEYS.has(key)) return;
      if (EDITABLE_KEYS.has(key) && isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const releaseScreenCapture = () =>
      postMessageToNative({ type: "SCREEN_CAPTURE", protect: false });
    const restoreFromCache = (event: PageTransitionEvent) => {
      if (event.persisted) postMessageToNative({ type: "SCREEN_CAPTURE", protect: true });
    };

    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    document.addEventListener("contextmenu", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", blockShortcuts);
    // Full page loads skip React cleanup, so release the app lock on unload too.
    window.addEventListener("pagehide", releaseScreenCapture);
    window.addEventListener("pageshow", restoreFromCache);
    postMessageToNative({ type: "SCREEN_CAPTURE", protect: true });

    return () => {
      root.classList.remove(PROTECTED_HTML_CLASS);
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", blockShortcuts);
      window.removeEventListener("pagehide", releaseScreenCapture);
      window.removeEventListener("pageshow", restoreFromCache);
      releaseScreenCapture();
    };
  }, []);

  return null;
}
