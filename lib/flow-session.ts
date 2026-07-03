const COMPARE_IDS_KEY = "ml_compare_product_ids";
const PENDING_PAYMENT_ORDERS_KEY = "ml_pending_payment_orders";
const RESET_EMAIL_KEY = "ml_reset_email";

const readJson = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
};

const removeKey = (key: string): void => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key);
};

export const setCompareProductIds = (ids: string[]): void => {
  writeJson(COMPARE_IDS_KEY, ids);
};

export const getCompareProductIds = (): string[] | null => {
  const ids = readJson<string[]>(COMPARE_IDS_KEY);
  if (!ids || !Array.isArray(ids) || ids.length === 0) return null;
  return ids.filter((id) => typeof id === "string" && id.trim().length > 0);
};

export const clearCompareProductIds = (): void => {
  removeKey(COMPARE_IDS_KEY);
};

export const setPendingPaymentOrderIds = (ids: string[]): void => {
  writeJson(PENDING_PAYMENT_ORDERS_KEY, ids);
};

export const consumePendingPaymentOrderIds = (): string[] => {
  const ids = readJson<string[]>(PENDING_PAYMENT_ORDERS_KEY) ?? [];
  removeKey(PENDING_PAYMENT_ORDERS_KEY);
  return ids.filter((id) => typeof id === "string" && id.trim().length > 0);
};

export const setResetEmail = (email: string): void => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESET_EMAIL_KEY, email.trim().toLowerCase());
};

export const getResetEmail = (): string | null => {
  if (typeof window === "undefined") return null;
  const email = sessionStorage.getItem(RESET_EMAIL_KEY);
  return email?.trim() || null;
};

export const clearResetEmail = (): void => {
  removeKey(RESET_EMAIL_KEY);
};
