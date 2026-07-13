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

/** Dataset stores lat in `longitude` and lng in `latitude` (legacy Algeria JSON). */
export function resolveWilayaFromCoordinates(
  latitude: number,
  longitude: number
): AlgeriaWilaya | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  let best: AlgeriaWilaya | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const w of ALGERIA_WILAYAS) {
    const wLat = parseFloat(w.longitude);
    const wLng = parseFloat(w.latitude);
    if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) continue;
    const dLat = latitude - wLat;
    const dLng = longitude - wLng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      best = w;
    }
  }

  return best;
}

export function getWilayaByCode(code: string): AlgeriaWilaya | undefined {
  return ALGERIA_WILAYAS.find((w) => w.code === code || w.id === code);
}

export function getWilayaLabel(code: string): string {
  return getWilayaByCode(code)?.name ?? code;
}

export function isValidWilayaCode(code: string): boolean {
  return ALGERIA_WILAYAS.some((w) => w.code === code);
}

export function normalizeWilayaName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bwilaya\b/gi, "")
    .replace(/\b(de|d|du|des)\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

const unpadNumericCode = (value: string): string | null => {
  if (!/^\d{1,2}$/.test(value.trim())) return null;
  const unpadded = String(parseInt(value.trim(), 10));
  return isValidWilayaCode(unpadded) ? unpadded : null;
};

/** Resolve wilaya name (Google/profile) or code to official code */
export function resolveWilayaCode(wilayaNameOrCode?: string | null): string | null {
  if (!wilayaNameOrCode) return null;
  const trimmed = String(wilayaNameOrCode).trim();
  if (!trimmed) return null;
  if (isValidWilayaCode(trimmed)) return trimmed;

  const padded = unpadNumericCode(trimmed);
  if (padded) return padded;

  const normalized = normalizeWilayaName(trimmed);
  if (!normalized) return null;

  const exact = ALGERIA_WILAYAS.find(
    (w) =>
      normalizeWilayaName(w.name) === normalized ||
      normalizeWilayaName(w.ar_name) === normalized ||
      w.id === trimmed ||
      w.code === trimmed
  );
  if (exact) return exact.code;

  const fuzzy = ALGERIA_WILAYAS.find((w) => {
    const n = normalizeWilayaName(w.name);
    return n.length >= 3 && (normalized.includes(n) || n.includes(normalized));
  });
  return fuzzy?.code ?? null;
}

export function wilayasMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const ca = resolveWilayaCode(a);
  const cb = resolveWilayaCode(b);
  if (ca && cb && ca === cb) return true;
  const na = normalizeWilayaName(String(a));
  const nb = normalizeWilayaName(String(b));
  return !!na && !!nb && na === nb;
}

export function extractWilayaFromCatalogItem(item: {
  wilaya?: string | null;
  unique_data?: Record<string, unknown> | null;
}): string | null {
  if (item.wilaya != null && String(item.wilaya).trim()) {
    return String(item.wilaya).trim();
  }
  const data = item.unique_data;
  if (!data || typeof data !== "object") return null;

  for (const key of ["wilaya", "Wilaya", "WILAYA", "wilaya_name", "Wilaya name"]) {
    const v = data[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (!/^wilaya$/i.test(key.trim())) continue;
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

export interface SupplierWilayaCoverage {
  coversAllWilayas?: boolean;
  wilayas?: string[];
  wilaya?: string | null;
}

export function supplierCoversWilaya(
  supplier: SupplierWilayaCoverage | null | undefined,
  clientWilayaCode: string | null
): boolean {
  if (!clientWilayaCode || !supplier) return false;
  if (supplier.coversAllWilayas) return true;
  const codes = supplier.wilayas || [];
  if (codes.length === 0) return false;
  return codes.some((c) => resolveWilayaCode(String(c)) === clientWilayaCode);
}

/** Match visitor wilaya to item unique_data.wilaya and/or supplier coverage. */
export function catalogItemAvailableInWilaya(
  item: {
    wilaya?: string | null;
    unique_data?: Record<string, unknown> | null;
    supplier?: SupplierWilayaCoverage | null;
  },
  clientWilayaCode: string | null,
  clientWilayaLabel?: string | null
): boolean {
  if (!clientWilayaCode && !clientWilayaLabel) return false;

  if (clientWilayaCode && supplierCoversWilaya(item.supplier, clientWilayaCode)) {
    return true;
  }

  const itemWilaya = extractWilayaFromCatalogItem(item);
  if (itemWilaya) {
    if (clientWilayaCode) {
      const itemCode = resolveWilayaCode(itemWilaya);
      if (itemCode && itemCode === clientWilayaCode) return true;
    }
    if (clientWilayaLabel && wilayasMatch(itemWilaya, clientWilayaLabel)) return true;
    if (clientWilayaCode) {
      const official = getWilayaByCode(clientWilayaCode);
      if (official && wilayasMatch(itemWilaya, official.name)) return true;
    }
  }

  if (item.supplier?.wilaya) {
    if (clientWilayaCode && resolveWilayaCode(item.supplier.wilaya) === clientWilayaCode) {
      return true;
    }
    if (clientWilayaLabel && wilayasMatch(item.supplier.wilaya, clientWilayaLabel)) {
      return true;
    }
  }

  return false;
}
