/** Detect catalog fields that expose monetary amounts. */

const PRICE_KEY_RE =
  /^(prix|price|sellingprice|purchaseprice|prix\s*ttc|prix\s*ht|normal_price|price_discount|price_by_one)/i;

export function isPriceFieldKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/[_-]+/g, " ");
  return PRICE_KEY_RE.test(normalized) || /\bprix\b/.test(normalized) || /\bprice\b/.test(normalized);
}

export function formatCatalogPriceDa(
  amount: number | string | null | undefined,
  fractionDigits = 2
): string {
  const n =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? parseFloat(amount.replace(",", ".").replace(/[^\d.-]/g, ""))
        : NaN;
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(fractionDigits)} DA`;
}
