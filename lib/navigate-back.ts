type BackRouter = {
  back: () => void;
  push: (href: string) => void;
};

/**
 * Go to the previous page when possible; otherwise open `fallbackHref`.
 * Uses history index when Next.js provides it, else history length.
 */
export function navigateBack(router: BackRouter, fallbackHref: string): void {
  if (typeof window === "undefined") {
    router.push(fallbackHref);
    return;
  }

  const state = window.history.state as { idx?: number } | null;
  if (typeof state?.idx === "number") {
    if (state.idx > 0) {
      router.back();
      return;
    }
    router.push(fallbackHref);
    return;
  }

  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallbackHref);
}
