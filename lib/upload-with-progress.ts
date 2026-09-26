/** Upload FormData with real XHR progress + cookies/CSRF (same as apiFetch). */

const CSRF_COOKIE_NAME = "ml_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

const getCsrfTokenFromDocument = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
};

export type UploadProgressResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
};

/**
 * POST FormData with upload progress (0–100).
 * Progress reaches 100 only after the server responds successfully.
 * On failure, progress stays below 100 and loading should be cleared by the caller.
 */
export const uploadFormDataWithProgress = <T = unknown>(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<UploadProgressResult<T>> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;

    const csrf = getCsrfTokenFromDocument();
    if (csrf) {
      xhr.setRequestHeader(CSRF_HEADER_NAME, csrf);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        onProgress(Math.min(90, 10));
        return;
      }
      // Reserve 100% for a successful server response
      const ratio = event.total > 0 ? event.loaded / event.total : 0;
      onProgress(Math.min(95, Math.round(ratio * 95)));
    };

    xhr.upload.onload = () => {
      // Bytes sent — waiting for server processing
      onProgress(96);
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out"));
    };

    xhr.onload = () => {
      let data: T;
      try {
        data = JSON.parse(xhr.responseText || "{}") as T;
      } catch {
        data = {} as T;
      }

      const ok = xhr.status >= 200 && xhr.status < 300;
      if (ok) {
        onProgress(100);
      }
      resolve({ ok, status: xhr.status, data });
    };

    onProgress(1);
    xhr.send(formData);
  });
