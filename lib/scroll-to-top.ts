/** Scroll the page (and common dashboards scroll roots) to the top. */
export const scrollPageToTop = (behavior: ScrollBehavior = "smooth") => {
  if (typeof window === "undefined") return;

  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTo({ top: 0, left: 0, behavior });
  document.body.scrollTo({ top: 0, left: 0, behavior });

  // Some layouts scroll an inner main/content container instead of the window
  const candidates = document.querySelectorAll<HTMLElement>(
    "main, [data-scroll-root], .overflow-y-auto, .overflow-auto"
  );
  candidates.forEach((el) => {
    if (el.scrollTop > 0) {
      el.scrollTo({ top: 0, left: 0, behavior });
    }
  });
};
