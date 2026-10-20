/** True only when stock is tracked and has run out (services / unknown stock never count). */
export const isOutOfStock = (quantity: unknown): boolean =>
  typeof quantity === "number" && quantity <= 0;

/**
 * Stable partition: available items first, "Rupture" items last.
 * The relative order inside each group (newest, price, distance…) is kept.
 */
export function inStockFirst<T>(
  items: T[],
  outOfStock: (item: T) => boolean = (item) =>
    isOutOfStock((item as { quantity?: unknown }).quantity)
): T[] {
  const available: T[] = [];
  const soldOut: T[] = [];
  for (const item of items) {
    (outOfStock(item) ? soldOut : available).push(item);
  }
  return soldOut.length === 0 ? items : [...available, ...soldOut];
}
