/** HTML escape for safe insertion into print templates */
export const escapeHtml = (value: unknown): string => {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const ALLOWED_ONBOARDING_REDIRECTS = new Set([
  "/client/upload-documents",
  "/supplier/upload-documents",
  "/client/choose-subscription",
  "/supplier/choose-subscription",
]);

export const validateOnboardingRedirect = (path: string | undefined | null): string | null => {
  if (!path || typeof path !== "string") return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const pathname = path.split("?")[0];
  if (!ALLOWED_ONBOARDING_REDIRECTS.has(pathname)) return null;
  // Client upload must open a fresh form (no restored previous File selection)
  if (pathname === "/client/upload-documents") {
    return "/client/upload-documents?fresh=1";
  }
  return pathname;
};

const CHARGILY_HOSTS = new Set([
  "pay.chargily.net",
  "pay.chargily.com",
  "test.pay.chargily.net",
]);

export const validateCheckoutUrl = (url: string | undefined | null): string | null => {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (!CHARGILY_HOSTS.has(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const buildAllowedPostMessageOrigins = (): Set<string> => {
  const origins = new Set<string>();

  if (typeof window !== "undefined") {
    origins.add(window.location.origin);
  }

  const fromEnv = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(",") ?? [];
  for (const origin of fromEnv) {
    const trimmed = origin.trim();
    if (trimmed) origins.add(trimmed);
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  const frontUrl = process.env.NEXT_PUBLIC_FRONT_URL?.trim();
  if (frontUrl) {
    try {
      origins.add(new URL(frontUrl).origin);
    } catch {
      // ignore invalid URL
    }
  }

  return origins;
};

export const isAllowedPostMessageOrigin = (origin: string): boolean => {
  if (buildAllowedPostMessageOrigins().has(origin)) return true;

  if (typeof window !== "undefined") {
    if (origin === window.location.origin) return true;

    // React Native WebView bridge may send empty/null origins
    const isNativeBridge = Boolean(getReactNativeWebView());
    if (isNativeBridge && (!origin || origin === "null")) {
      return true;
    }
  }

  return false;
};

export type ReactNativeWebViewBridge = {
  postMessage: (message: string) => void;
};

export const getReactNativeWebView = (): ReactNativeWebViewBridge | null => {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { ReactNativeWebView?: ReactNativeWebViewBridge })
    .ReactNativeWebView;
  return bridge ?? null;
};

export const postMessageToNative = (payload: Record<string, unknown>): void => {
  getReactNativeWebView()?.postMessage(JSON.stringify(payload));
};

/** Validate Google Maps API key format and presence */
export const getValidatedGoogleMapsApiKey = (): string | null => {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === "your_google_maps_api_key_here") return null;
  if (!/^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Google Maps API key format looks invalid. Restrict it in Google Cloud Console.");
    }
    return key;
  }
  return key;
};
