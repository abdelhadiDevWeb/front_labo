import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { logoutClient } from "@/lib/api";

const notifyNativeLogout = (): void => {
  if (typeof window !== "undefined" && (window as Window & { ReactNativeWebView?: { postMessage: (msg: string) => void } }).ReactNativeWebView) {
    (window as Window & { ReactNativeWebView: { postMessage: (msg: string) => void } }).ReactNativeWebView.postMessage(
      JSON.stringify({ type: "LOGOUT" })
    );
  }
};

export const performLogout = async (
  router: AppRouterInstance,
  options?: { clearCart?: boolean; redirectTo?: string }
): Promise<void> => {
  await logoutClient();
  notifyNativeLogout();

  if (options?.clearCart && typeof window !== "undefined") {
    localStorage.removeItem("cart");
  }

  router.push(options?.redirectTo || "/login");
};
