import { getAuthToken } from "./api";

export interface UserRole {
  id: string;
  email: string;
  role: string;
}

// Get user role from JWT token
export const getUserRole = (): string | null => {
  if (typeof window === "undefined") return null;
  
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

// Check if user has required role
export const hasRole = (requiredRole: string): boolean => {
  const userRole = getUserRole();
  return userRole === requiredRole;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

