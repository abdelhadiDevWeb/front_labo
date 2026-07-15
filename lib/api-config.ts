/**
 * API configuration.
 *
 * Browser always uses same-origin `/api` → `app/api/[...path]/route.ts` (BFF).
 * That rewrites Set-Cookie onto the frontend domain so Hostinger sessions work.
 *
 * Set NEXT_PUBLIC_API_URL to the public Express API (with https://).
 * On the same Hostinger machine, also set API_INTERNAL_URL=http://127.0.0.1:PORT/api
 * so the BFF talks to Express directly (avoids proxy looping to Next itself).
 */

import {
  ensureAbsoluteHttpUrl,
  isLocalApiUrl,
  resolveEnvApiUrl,
} from "./api-url";

const isDev = process.env.NODE_ENV === "development";

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

/** Browser: `/api` BFF. Server: absolute backend URL. */
export const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    if (!isDev) {
      const fromEnv = resolveEnvApiUrl();
      if (fromEnv && isLocalApiUrl(fromEnv)) {
        console.error(
          "[api-config] NEXT_PUBLIC_API_URL points to localhost in production. Set it to your public backend URL before building."
        );
      }
    }
    return "/api";
  }
  return getServerApiUrl();
};

/** Socket.io / media base — same-origin in production (socket rewrite). */
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

export { ensureAbsoluteHttpUrl, resolveEnvApiUrl, isLocalApiUrl };

/** @deprecated Use getApiUrl() */
export const API_BASE_URL = typeof window === "undefined" ? getServerApiUrl() : "/api";
