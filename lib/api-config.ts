/**
 * API Configuration Utility
 * 
 * Provides consistent API URL handling across the application.
 * Reads from NEXT_PUBLIC_API_URL environment variable.
 * 
 * Usage:
 * - getApiUrl() - Returns full API URL with /api path (e.g., "http://localhost:8000/api")
 * - getBaseUrl() - Returns base URL without /api path (e.g., "http://localhost:8000")
 */

/**
 * Get the full API URL with /api path
 * @returns API URL string (e.g., "http://localhost:8000/api")
 */
export const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) {
    // If env URL already includes /api, return as is
    if (envUrl.includes('/api')) {
      return envUrl;
    }
    // Otherwise, append /api
    return `${envUrl}/api`;
  }
  
  // Fallback to localhost
  return "http://localhost:8000/api";
};

/**
 * Get the base URL without /api path
 * Useful for socket connections, image URLs, etc.
 * @returns Base URL string (e.g., "http://localhost:8000")
 */
export const getBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) {
    // Remove /api if present
    return envUrl.replace('/api', '');
  }
  
  // Fallback to localhost
  return "http://localhost:8000";
};

/**
 * Get API base URL (same as getApiUrl, kept for backward compatibility)
 * @deprecated Use getApiUrl() instead
 */
export const API_BASE_URL = getApiUrl();
