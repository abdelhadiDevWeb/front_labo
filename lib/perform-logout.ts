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

  if (options?.clearCart && typeof window !== "undefined") {
    localStorage.removeItem("cart");
  }

  router.push(options?.redirectTo || "/login");
};
