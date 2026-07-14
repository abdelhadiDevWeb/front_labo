import { getApiUrl } from "@/lib/api-config";

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

/**
 * Build a media URL from a backend relative path.
 * All uploads are served exclusively via /api/files/*
 * (public catalog media allowed without auth; sensitive files require ACL).
 */
export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return "";

  const value = path.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return isTrustedAbsoluteUrl(value) ? value : "";
  }

  const normalizedPath = value.startsWith("/") ? value.slice(1) : value;
  const filePath = normalizedPath.replace(/^uploads\//i, "");

  return `${getApiUrl()}/files/${filePath}`.replace(/([^:]\/)\/+/g, "$1");
};
