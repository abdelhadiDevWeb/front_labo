/**
 * Shared API URL helpers (browser + Next BFF + next.config).
 */

export const ensureAbsoluteHttpUrl = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Hostinger env values are often pasted without protocol — default to https.
  return `https://${trimmed}`;
};

export const resolveEnvApiUrl = (
  raw = process.env.NEXT_PUBLIC_API_URL
): string | null => {
  const envUrl = raw?.trim();
  if (!envUrl) return null;

  const absolute = ensureAbsoluteHttpUrl(envUrl);
  if (absolute.includes("/api")) {
    return absolute.replace(/\/$/, "");
  }
  return `${absolute.replace(/\/$/, "")}/api`;
};

export const isLocalApiUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(ensureAbsoluteHttpUrl(url));
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};
