import { getApiUrl } from "@/lib/api-config";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Public origin that serves `/api/files/*` directly (Express subdomain or a CDN
 * in front of it), e.g. https://media.dzlabmarket.com. Unset → same-origin BFF.
 */
const getDirectMediaOrigin = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_MEDIA_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && !LOCAL_HOSTS.has(parsed.hostname)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

/** Must mirror PUBLIC_PREFIXES in backEnd_Labo Files.controller (no auth required). */
const DIRECT_MEDIA_PREFIXES = [
  "categories/",
  "sous-categories/",
  "products/images/",
  "products/videos/",
  "sponsors/images/",
  "sponsors/videos/",
  "profile/",
  "profile-images/",
];

/**
 * PDFs stay same-origin: they are framed in-page, and Express (helmet)
 * forbids cross-origin framing.
 */
const DIRECT_MEDIA_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|avif|bmp|svg|mp4|webm|mov|m4v|ogg|ogv)$/i;

const isDirectMediaPath = (filePath: string): boolean => {
  const lower = filePath.toLowerCase();
  return (
    DIRECT_MEDIA_EXTENSIONS.test(lower) &&
    DIRECT_MEDIA_PREFIXES.some((prefix) => lower.startsWith(prefix))
  );
};

/** `filePath` is relative to uploads/, e.g. `products/images/a.jpg`. */
const buildFilesUrl = (filePath: string): string => {
  const directOrigin = getDirectMediaOrigin();
  if (directOrigin && isDirectMediaPath(filePath)) {
    return `${directOrigin}/api/files/${filePath}`;
  }
  return `${getApiUrl()}/files/${filePath}`.replace(/([^:]\/)\/+/g, "$1");
};

const getTrustedMediaHosts = (): Set<string> => {
  const hosts = new Set(LOCAL_HOSTS);

  const mediaOrigin = getDirectMediaOrigin();
  if (mediaOrigin) {
    hosts.add(new URL(mediaOrigin).hostname);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    try {
      hosts.add(new URL(apiUrl).hostname);
    } catch {
      // ignore invalid env URL
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      hosts.add(new URL(siteUrl).hostname);
    } catch {
      // ignore
    }
  }

  // Production marketplace host
  hosts.add("dzlabmarket.com");
  hosts.add("www.dzlabmarket.com");

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
 * Extract stable `uploads/...` key from Hostinger absolute paths, Windows paths,
 * or already-relative DB values.
 */
export const toUploadsRelativePath = (
  pathValue: string | null | undefined
): string | null => {
  if (!pathValue) return null;
  const normalized = pathValue.replace(/\\/g, "/").trim();
  if (!normalized) return null;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const pathname = new URL(normalized).pathname.replace(/\\/g, "/");
      const filesMatch = pathname.match(/\/(?:api\/)?files\/(.+)$/i);
      if (filesMatch?.[1]) {
        return `uploads/${decodeURIComponent(filesMatch[1]).replace(/^\/+/, "")}`;
      }
      const uploadsIdx = pathname.toLowerCase().indexOf("/uploads/");
      if (uploadsIdx >= 0) {
        return pathname.slice(uploadsIdx + 1);
      }
    } catch {
      // ignore
    }
    return normalized;
  }

  const lower = normalized.toLowerCase();
  const marker = "/uploads/";
  const idx = lower.indexOf(marker);
  if (idx >= 0) return normalized.slice(idx + 1);

  if (lower.startsWith("uploads/")) return normalized;

  if (
    /^(products|categories|sous-categories|profile|profile-images|payments|documents|excel|sponsors|_defaults)\//i.test(
      normalized
    )
  ) {
    return `uploads/${normalized.replace(/^\/+/, "")}`;
  }

  return null;
};

/**
 * Build a media URL from a backend relative path.
 * All uploads are served exclusively via /api/files/*
 * (public catalog media allowed without auth; sensitive files require ACL).
 *
 * Public images/videos go straight to NEXT_PUBLIC_MEDIA_URL when set; everything
 * else (and everything when unset) uses the same-origin BFF `/api/files/...`.
 * Also repairs legacy absolute Hostinger paths and old `/uploads/...` URLs (410 on deploy).
 */
export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return "";

  const value = path.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const pathname = parsed.pathname.replace(/\\/g, "/");

      // Already a files endpoint → rebuild so it follows the current media origin
      const filesMatch = pathname.match(/\/(?:api\/)?files\/(.+)$/i);
      if (filesMatch?.[1]) {
        const filePath = decodeURIComponent(filesMatch[1]).replace(/^\/+/, "");
        if (filePath && !filePath.startsWith("home/")) {
          return buildFilesUrl(filePath);
        }
      }

      // Legacy direct /uploads/... (Express returns 410) → rewrite to /api/files/...
      const uploadsMatch = pathname.match(/\/uploads\/(.+)$/i);
      if (uploadsMatch?.[1]) {
        const filePath = decodeURIComponent(uploadsMatch[1]).replace(/^\/+/, "");
        if (filePath && !filePath.startsWith("home/")) {
          return buildFilesUrl(filePath);
        }
      }
    } catch {
      // fall through
    }

    // Non-upload absolute URL (e.g. CDN) — only allow trusted hosts
    return isTrustedAbsoluteUrl(value) ? value : "";
  }

  const relative = toUploadsRelativePath(value) || value;
  const normalizedPath = relative.startsWith("/") ? relative.slice(1) : relative;
  const filePath = normalizedPath.replace(/^uploads\//i, "");

  if (!filePath || filePath.startsWith("home/")) {
    // Still looks like a broken absolute server path — give up cleanly
    return "";
  }

  return buildFilesUrl(filePath);
};
