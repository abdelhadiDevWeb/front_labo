/**
 * Server-side only (route handlers, layouts, sitemap) — reads a private env
 * secret. Never import from "use client" modules.
 */
export const BFF_CLIENT_IP_HEADER = "x-ml-client-ip";
export const BFF_SECRET_HEADER = "x-ml-bff-secret";

const bffSecret = (): string => process.env.BFF_SHARED_SECRET?.trim() || "";

/**
 * Pick the visitor IP from X-Forwarded-For. Entries left of the ones added by
 * our own proxies are client-controlled, so count from the right.
 * TRUSTED_PROXY_HOPS = proxies in front of Next that append to the header.
 */
export const resolveForwardedClientIp = (forwardedFor: string | null): string | null => {
  const chain = (forwardedFor || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (chain.length === 0) return null;
  const hops = Math.max(1, Number.parseInt(process.env.TRUSTED_PROXY_HOPS || "1", 10) || 1);
  return chain[Math.max(0, chain.length - hops)];
};

/** Headers for a proxied browser request: real client IP + shared secret. */
export const bffClientHeaders = (forwardedFor: string | null): Record<string, string> => {
  const secret = bffSecret();
  const clientIp = resolveForwardedClientIp(forwardedFor);
  if (!secret || !clientIp) return {};
  return { [BFF_SECRET_HEADER]: secret, [BFF_CLIENT_IP_HEADER]: clientIp };
};

/** Headers for server-to-server fetches (metadata, sitemap) — no visitor IP. */
export const bffInternalHeaders = (): Record<string, string> => {
  const secret = bffSecret();
  return secret ? { [BFF_SECRET_HEADER]: secret } : {};
};
