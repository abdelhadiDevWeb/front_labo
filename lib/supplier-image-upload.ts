import { apiFetch } from "@/lib/api";
import { getApiUrl } from "@/lib/api-config";
import { compressImageForUpload } from "@/lib/image-compress";

/** Stays well under the ~50 MB proxy body limit and the backend's 50 files per batch. */
const MAX_FILES_PER_BATCH = 25;
const MAX_BYTES_PER_BATCH = 35 * 1024 * 1024;
const COMPRESS_CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;

export const imageFileKey = (file: File): string =>
  `${file.name}|${file.size}|${file.lastModified}`;

type PreparedImage = { original: File; upload: File };

export type SupplierImageUploadResult =
  | { ok: true; uploaded: number }
  | { ok: false; uploaded: number; message: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const compressAll = async (files: File[]): Promise<PreparedImage[]> => {
  const out: PreparedImage[] = new Array(files.length);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const index = next++;
      const original = files[index];
      out[index] = { original, upload: await compressImageForUpload(original) };
    }
  };
  await Promise.all(Array.from({ length: Math.min(COMPRESS_CONCURRENCY, files.length) }, worker));
  return out;
};

const sendBatch = async (batch: PreparedImage[]): Promise<{ ok: true } | { ok: false; message: string }> => {
  const form = new FormData();
  form.append("originalNames", JSON.stringify(batch.map((item) => item.original.name)));
  batch.forEach((item) => form.append("images", item.upload, item.upload.name));

  let lastMessage = "Erreur lors de l'envoi des images";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await apiFetch(`${getApiUrl()}/supplier-images/batch`, {
        method: "POST",
        body: form,
      });
      if (response.ok) return { ok: true };

      const result = await response.json().catch(() => null);
      lastMessage = result?.message || lastMessage;
      // Validation / auth / quota errors will not fix themselves on retry.
      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        return { ok: false, message: lastMessage };
      }
    } catch {
      lastMessage = "Connexion interrompue pendant l'envoi des images";
    }
    if (attempt < MAX_ATTEMPTS) await sleep(attempt * 2000);
  }
  return { ok: false, message: lastMessage };
};

/**
 * Uploads any number of photos to the supplier image library in small batches
 * (compressed in the browser first). Files whose key is in `alreadyUploaded` are skipped,
 * so calling it again after a failure resumes where it stopped.
 */
export const uploadSupplierImages = async (
  files: File[],
  options: {
    alreadyUploaded: Set<string>;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<SupplierImageUploadResult> => {
  const total = files.length;
  const pending = files.filter((file) => !options.alreadyUploaded.has(imageFileKey(file)));
  let done = total - pending.length;
  options.onProgress?.(done, total);

  let index = 0;
  while (index < pending.length) {
    const chunk = pending.slice(index, index + MAX_FILES_PER_BATCH);
    const prepared = await compressAll(chunk);

    // Split further if compressed files are still too heavy for one request.
    let start = 0;
    while (start < prepared.length) {
      const batch: PreparedImage[] = [];
      let bytes = 0;
      while (start < prepared.length) {
        const size = prepared[start].upload.size;
        if (batch.length > 0 && bytes + size > MAX_BYTES_PER_BATCH) break;
        batch.push(prepared[start]);
        bytes += size;
        start++;
      }

      const result = await sendBatch(batch);
      if (!result.ok) {
        return { ok: false, uploaded: done, message: result.message };
      }
      batch.forEach((item) => options.alreadyUploaded.add(imageFileKey(item.original)));
      done += batch.length;
      options.onProgress?.(done, total);
    }

    index += chunk.length;
  }

  return { ok: true, uploaded: done };
};
