/**
 * API configuration.
 *
 * Browser always uses same-origin `/api` (Next rewrite → backend) so HttpOnly
 * auth cookies are set on the frontend domain. That is required for middleware
 * and for production hosts (Hostinger) where frontend and backend differ.
 *
 * NEXT_PUBLIC_API_URL must be the public backend URL at build time so
 * next.config rewrites can proxy `/api` correctly (never leave localhost in prod).
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

const isLocalApiUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
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
 * Browser: same-origin `/api` (Next rewrite).
 * Server: explicit env URL.
 */
export const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    if (!isDev) {
      const fromEnv = resolveEnvApiUrl();
      if (fromEnv && isLocalApiUrl(fromEnv)) {
        console.error(
          "[api-config] NEXT_PUBLIC_API_URL points to localhost in production. Set it to your public backend URL before building (e.g. https://your-api.example.com/api)."
        );
      }
    }
    return "/api";
  }
  return getServerApiUrl();
};

/**
 * Base URL without `/api` — Socket.io / absolute media via same-origin rewrite.
 */
export const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    if (isDev) {
      return "http://localhost:8000";
    }
    return window.location.origin;
  }
  return getServerBaseUrl();
};

/** Safely parse a Response body as JSON; empty/non-JSON bodies become a clear error. */
export const parseResponseJson = async <T = unknown>(
  response: Response
): Promise<T> => {
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error(
      `Réponse vide du serveur (HTTP ${response.status}). Vérifiez l'URL de l'API et que le backend est en ligne.`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Réponse invalide du serveur (HTTP ${response.status}). Vérifiez l'URL de l'API et que le backend est en ligne.`
    );
  }
};

/** @deprecated Use getApiUrl() */
export const API_BASE_URL = typeof window === "undefined" ? getServerApiUrl() : "/api";
