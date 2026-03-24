import { getBaseUrl } from "@/lib/api-config";

/**
 * Build a full media URL from a backend relative path using NEXT_PUBLIC_API_URL base.
 * Returns the original value if it is already an absolute URL.
 */
export const getMediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;

  const value = path.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value.slice(1) : value;
  return `${getBaseUrl()}/${normalizedPath}`.replace(/([^:]\/)\/+/g, "$1");
};

