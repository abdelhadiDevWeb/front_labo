import wilayasData from "@/data/algeria/wilayas.json";

export interface AlgeriaWilaya {
  id: string;
  code: string;
  name: string;
  ar_name: string;
  longitude: string;
  latitude: string;
}

export const ALGERIA_WILAYAS: AlgeriaWilaya[] = wilayasData as AlgeriaWilaya[];

export const ALGERIA_WILAYA_CODES = ALGERIA_WILAYAS.map((w) => w.code);

export function getWilayaByCode(code: string): AlgeriaWilaya | undefined {
  return ALGERIA_WILAYAS.find((w) => w.code === code || w.id === code);
}

export function getWilayaLabel(code: string): string {
  return getWilayaByCode(code)?.name ?? code;
}

export function isValidWilayaCode(code: string): boolean {
  return ALGERIA_WILAYAS.some((w) => w.code === code);
}

function normalizeWilayaName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bwilaya\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Resolve wilaya name (Google/profile) or code to official code */
export function resolveWilayaCode(wilayaNameOrCode?: string | null): string | null {
  if (!wilayaNameOrCode) return null;
  const trimmed = wilayaNameOrCode.trim();
  if (!trimmed) return null;
  if (isValidWilayaCode(trimmed)) return trimmed;

  const normalized = normalizeWilayaName(trimmed);
  const match = ALGERIA_WILAYAS.find(
    (w) =>
      normalizeWilayaName(w.name) === normalized ||
      normalizeWilayaName(w.ar_name) === normalized ||
      w.id === trimmed
  );
  return match?.code ?? null;
}

export interface SupplierWilayaCoverage {
  coversAllWilayas?: boolean;
  wilayas?: string[];
}

export function supplierCoversWilaya(
  supplier: SupplierWilayaCoverage | null | undefined,
  clientWilayaCode: string | null
): boolean {
  if (!clientWilayaCode || !supplier) return false;
  if (supplier.coversAllWilayas) return true;
  const codes = supplier.wilayas || [];
  // Supplier has not configured delivery areas yet — show products everywhere.
  if (codes.length === 0) return true;
  return codes.includes(clientWilayaCode);
}
