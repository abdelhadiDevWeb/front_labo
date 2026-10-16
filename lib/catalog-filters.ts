/** Opens the filter panel (if closed) and scrolls it into view — for mobile/app UX. */
export function revealCatalogFilters(
  setShowFilters: (value: boolean | ((prev: boolean) => boolean)) => void,
  options?: { id?: string; toggle?: boolean }
) {
  const id = options?.id ?? "catalog-filters";
  if (options?.toggle) {
    setShowFilters((prev) => {
      const next = !prev;
      if (next) scrollToCatalogFilters(id);
      return next;
    });
    return;
  }
  setShowFilters(true);
  scrollToCatalogFilters(id);
}

export function scrollToCatalogFilters(id = "catalog-filters") {
  // Wait until a previously-hidden panel is in the layout.
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
}
