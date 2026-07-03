const isDev = process.env.NODE_ENV === "development";

export const devLog = (...args: unknown[]): void => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]): void => {
  if (isDev) console.warn(...args);
};

export const devError = (...args: unknown[]): void => {
  if (isDev) console.error(...args);
};
