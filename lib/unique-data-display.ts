/** Helpers to render unique_data fields dynamically (DB key names as labels). */

const HIDDEN_UNIQUE_KEYS = new Set([
  "images",
  "video",
  "latitude",
  "longitude",
  "wilaya",
  "daira",
  "commune",
]);

const TITLE_KEYS = ["Désignation", "designation", "name", "nom", "Nom"];

export const pickFromUniqueData = (
  data: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback = ""
): string => {
  if (!data) return fallback;
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  const lower = new Map(
    Object.entries(data).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
  for (const key of keys) {
    const value = lower.get(key.toLowerCase().trim());
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
};

export const getUniqueDataTitle = (
  data: Record<string, unknown> | null | undefined,
  fallback = "Sans nom"
): string => pickFromUniqueData(data, TITLE_KEYS, fallback);

export const getUniqueDataEntries = (
  data: Record<string, unknown> | null | undefined,
  options?: { max?: number; excludeKeys?: string[] }
): Array<[string, string]> => {
  if (!data) return [];
  const exclude = new Set([
    ...HIDDEN_UNIQUE_KEYS,
    ...(options?.excludeKeys || []),
    ...TITLE_KEYS,
  ]);

  const entries = Object.entries(data).filter(([key, value]) => {
    if (exclude.has(key)) return false;
    if (TITLE_KEYS.some((t) => t.toLowerCase() === key.toLowerCase())) return false;
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return false;
    if (typeof value === "object") return false;
    return true;
  });

  const formatted = entries.map(([key, value]) => [
    key,
    typeof value === "number" ? String(value) : String(value),
  ]) as Array<[string, string]>;

  if (options?.max && options.max > 0) {
    return formatted.slice(0, options.max);
  }
  return formatted;
};

/** Build a displayable unique_data object from a public product flat shape when unique_data is missing */
export const productToUniqueData = (product: {
  unique_data?: Record<string, unknown>;
  name?: string;
  brand?: string;
  category?: string;
  price?: number;
  quantity?: number;
  deliveryTime?: string;
  productType?: string;
  purchasePrice?: number;
  sellingPrice?: number;
}): Record<string, unknown> => {
  if (product.unique_data && Object.keys(product.unique_data).length > 0) {
    return product.unique_data;
  }
  const d: Record<string, unknown> = {};
  if (product.name) d.name = product.name;
  if (product.brand) d.brand = product.brand;
  if (product.category) d.Catégorie = product.category;
  if (product.price != null) d["Prix TTC"] = product.price;
  if (product.sellingPrice != null) d.sellingPrice = product.sellingPrice;
  if (product.purchasePrice != null) d.purchasePrice = product.purchasePrice;
  if (product.quantity != null) d.quantity = product.quantity;
  if (product.deliveryTime) d.deliveryTime = product.deliveryTime;
  if (product.productType) d.productType = product.productType;
  return d;
};
