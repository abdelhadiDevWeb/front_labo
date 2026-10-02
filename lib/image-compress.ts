const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
/** Small files are sent as-is: re-encoding them would barely save anything. */
const SKIP_BELOW_BYTES = 300 * 1024;

const replaceExtension = (name: string, ext: string): string => {
  const base = name.replace(/\.[^/.]+$/, "");
  return `${base || "image"}${ext}`;
};

/**
 * Resize (max 1600px) and re-encode a photo as JPEG in the browser.
 * Returns the original file when compression is not possible or not smaller (GIFs stay untouched).
 */
export const compressImageForUpload = async (file: File): Promise<File> => {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") return file;
  if (file.type === "image/gif" || file.size <= SKIP_BELOW_BYTES) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no transparency: paint transparent PNG areas white instead of black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    canvas.width = 0;
    canvas.height = 0;

    if (!blob || blob.size >= file.size) return file;
    return new File([blob], replaceExtension(file.name, ".jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
};
