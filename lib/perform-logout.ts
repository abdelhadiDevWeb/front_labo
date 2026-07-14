import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { logoutClient } from "@/lib/api";
import { postMessageToNative } from "@/lib/security";

const notifyNativeLogout = (): void => {
  postMessageToNative({ type: "LOGOUT" });
};

export const performLogout = async (
  router: AppRouterInstance,
  options?: { clearCart?: boolean; redirectTo?: string }
): Promise<void> => {
  await logoutClient();
  notifyNativeLogout();

  const redirectTo = options?.redirectTo || "/login";

  if (typeof window !== "undefined") {
    if (options?.clearCart) {
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
    }

    // Notify pages that keep local auth UI state (e.g. home already on /home)
    window.dispatchEvent(new Event("auth:logout"));

    // Hard navigation remounts the page so auth/cart UI cannot stay "logged in"
    // after logout when redirecting to the same route (especially /home).
    window.location.assign(redirectTo);
    return;
  }

  router.push(redirectTo);
};
