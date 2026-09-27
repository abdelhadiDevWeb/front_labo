import type { CatalogItemType } from "@/lib/api";

export const catalogItemHref = (type: CatalogItemType | undefined, id: string): string =>
  type === "machine" ? `/machines/${id}` : type === "service" ? `/services/${id}` : `/products/${id}`;
