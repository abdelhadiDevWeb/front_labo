import { getMediaUrl, toUploadsRelativePath } from "@/lib/media-url";
import { isFicheTechniqueField } from "@/lib/catalog-form-fields";

/** Detect a stored fiche-technique PDF path (relative, absolute Hostinger, or URL). */
export const isFicheTechniquePdfValue = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase().replace(/\\/g, "/");
  return (
    /\.pdf($|\?)/i.test(trimmed) ||
    /\/products\/docs\//i.test(lower) ||
    /uploads\/.*docs?\//i.test(lower) ||
    /uploads\/pdf\//i.test(lower)
  );
};

/**
 * Resolve fiche technique PDF to a same-origin `/api/files/...` URL
 * that works locally and on https://dzlabmarket.com.
 */
export const getFicheTechniquePdfUrl = (
  uniqueData: Record<string, unknown> | null | undefined
): string | null => {
  if (!uniqueData) return null;

  for (const [key, value] of Object.entries(uniqueData)) {
    if (!isFicheTechniqueField(key) || !isFicheTechniquePdfValue(value)) {
      continue;
    }
    const raw = String(value).trim();
    const url = getMediaUrl(raw);
    if (url) return url;

    // Last resort: force extract uploads/... then rebuild
    const relative = toUploadsRelativePath(raw);
    if (relative) {
      const rebuilt = getMediaUrl(relative);
      if (rebuilt) return rebuilt;
    }
  }

  return null;
};
