import { checkAuthSession, getSessionRole } from "./api";
import { hasAuthSessionHint } from "./auth-session";

export interface UserRole {
  id: string;
  email: string;
  role: string;
}

let cachedRole: string | null = null;

export const getUserRole = (): string | null => cachedRole;

export const loadUserRole = async (): Promise<string | null> => {
  const session = await getSessionRole();
  cachedRole = session?.role ?? null;
  return cachedRole;
};

export const hasRole = (requiredRole: string): boolean => {
  return getUserRole() === requiredRole;
};

export const isAuthenticated = (): boolean => hasAuthSessionHint();

export const ensureAuthenticated = async (): Promise<boolean> => {
  if (hasAuthSessionHint()) return true;
  const ok = await checkAuthSession();
  if (ok) await loadUserRole();
  return ok;
};
