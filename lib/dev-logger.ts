const isDev = process.env.NODE_ENV === "development";

export const devLog = (...args: unknown[]): void => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]): void => {
  if (isDev) console.warn(...args);
};

export const devError = (...args: unknown[]): void => {
  if (!isDev) return;
  // Avoid console.error(Error) — Next.js overlays treat it as a page crash.
  const safe = args.map((arg) =>
    arg instanceof Error ? `${arg.name}: ${arg.message}` : arg
  );
  console.warn(...safe);
};
