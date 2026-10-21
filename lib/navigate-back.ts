import { hasInAppPrevious } from "@/lib/nav-history";

type BackRouter = {
  back: () => void;
  push: (href: string) => void;
};

/**
 * Go to the previous page of the site when there is one in this tab;
 * otherwise open `fallbackHref` (direct open, refresh after login, link from outside…).
 */
export function navigateBack(router: BackRouter, fallbackHref: string): void {
  if (typeof window !== "undefined" && hasInAppPrevious()) {
    router.back();
    return;
  }
  router.push(fallbackHref);
}
