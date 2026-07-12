import { getBaseUrl } from "@/lib/api-config";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const getTrustedMediaHosts = (): Set<string> => {
  const hosts = new Set(LOCAL_HOSTS);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    try {
      hosts.add(new URL(apiUrl).hostname);
    } catch {
      // ignore invalid env URL
    }
  }

  const extraHosts = process.env.NEXT_PUBLIC_TRUSTED_MEDIA_HOSTS?.split(",") ?? [];
  for (const host of extraHosts) {
    const trimmed = host.trim();
    if (trimmed) hosts.add(trimmed);
  }

  if (typeof window !== "undefined") {
    hosts.add(window.location.hostname);
  }

  return hosts;
};

const isTrustedAbsoluteUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return getTrustedMediaHosts().has(parsed.hostname);
  } catch {
    return false;
  }
};

const SENSITIVE_UPLOAD_PREFIXES = [
  "uploads/documents/",
  "uploads/payments/",
  "uploads/profile/",
  "uploads/profile-images/",
  "uploads/excel/",
];

/**
 * Build a full media URL from a backend relative path.
 * Sensitive uploads are routed through the authenticated /api/files proxy.
 * Public uploads use same-origin /uploads/* (Next.js rewrite → backend).
 */
export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return "";

  const value = path.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return isTrustedAbsoluteUrl(value) ? value : "";
  }

  const normalizedPath = value.startsWith("/") ? value.slice(1) : value;

  if (typeof window !== "undefined") {
    const isSensitive = SENSITIVE_UPLOAD_PREFIXES.some((prefix) =>
      normalizedPath.startsWith(prefix)
    );
    if (isSensitive) {
      const filePath = normalizedPath.replace(/^uploads\//, "");
      return `/api/files/${filePath}`;
    }

    // Same-origin path — proxied by next.config rewrite to the backend
    if (normalizedPath.startsWith("uploads/")) {
      return `/${normalizedPath}`;
    }
  }

  const built = `${getBaseUrl()}/${normalizedPath}`.replace(/([^:]\/)\/+/g, "$1");
  return isTrustedAbsoluteUrl(built) ? built : "";
};
