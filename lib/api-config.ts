/**
 * API configuration — browser uses same-origin `/api` proxy for HttpOnly cookies.
 */

const isDev = process.env.NODE_ENV === "development";

const resolveEnvApiUrl = (): string | null => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envUrl) return null;

  if (envUrl.includes("/api")) {
    return envUrl.replace(/\/$/, "");
  }
  return `${envUrl.replace(/\/$/, "")}/api`;
};

const getServerApiUrl = (): string => {
  const fromEnv = resolveEnvApiUrl();
  if (fromEnv) return fromEnv;

  if (!isDev) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be set in production (e.g. https://api.example.com/api)"
    );
  }

  return "http://localhost:8000/api";
};

const getServerBaseUrl = (): string => getServerApiUrl().replace(/\/api\/?$/, "");

/**
 * Full API URL with `/api` path.
 * Browser: same-origin `/api` (Vercel rewrite → Render) so auth cookies stay on the front domain.
 * Server: explicit env URL.
 */
export const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    return "/api";
  }
  return getServerApiUrl();
};

/**
 * Base URL without `/api` — Socket.io + public media.
 * Browser must talk to Render directly: Vercel rewrites do not proxy WebSockets.
 */
export const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const fromEnv = resolveEnvApiUrl();
    if (fromEnv) {
      return fromEnv.replace(/\/api\/?$/, "");
    }
    if (!isDev) {
      return window.location.origin;
    }
    return "http://localhost:8000";
  }
  return getServerBaseUrl();
};

/** @deprecated Use getApiUrl() */
export const API_BASE_URL = getApiUrl();
