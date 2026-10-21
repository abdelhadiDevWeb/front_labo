/**
 * In-app navigation stack (per browser tab, sessionStorage).
 * Lets "Retour" buttons know whether the previous history entry is a page of this site,
 * so they never send the user out of the app or back to the login form.
 */
const KEY = "app-nav-stack";
const MAX_ENTRIES = 50;

/** Entering these pages starts a fresh stack: "Retour" must never lead back to them. */
const RESET_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-reset-code",
  "/reset-password",
];

const read = (): string[] => {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const write = (stack: string[]) => {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(stack));
  } catch {
    // storage full / disabled — navigation still works with the fallback
  }
};

/** Call on every route change with the current pathname. */
export function recordNavigation(path: string): void {
  if (typeof window === "undefined") return;
  if (RESET_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    write([]);
    return;
  }

  const stack = read();
  const last = stack[stack.length - 1];
  if (last === path) return;
  if (stack.length >= 2 && stack[stack.length - 2] === path) {
    // Browser / in-app "back" to the previous entry
    stack.pop();
  } else {
    stack.push(path);
    if (stack.length > MAX_ENTRIES) stack.splice(0, stack.length - MAX_ENTRIES);
  }
  write(stack);
}

/** True when the previous history entry is a page of this site visited in this tab. */
export function hasInAppPrevious(): boolean {
  if (typeof window === "undefined") return false;
  return read().length >= 2;
}
