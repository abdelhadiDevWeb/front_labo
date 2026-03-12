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
  // In Next.js, NEXT_PUBLIC_ variables are embedded at build time and available via process.env
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) {
    // Trim any whitespace and newlines
    const trimmedUrl = envUrl.trim();
    
    // If env URL already includes /api, return as is
    if (trimmedUrl.includes('/api')) {
      return trimmedUrl;
    }
    // Otherwise, append /api
    return `${trimmedUrl}/api`;
  }
  
  // Fallback to localhost (only log warning in development)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ NEXT_PUBLIC_API_URL not found in .env.local, using fallback: http://localhost:8000/api');
    console.warn('💡 Make sure .env.local contains: NEXT_PUBLIC_API_URL=your-backend-url');
  }
  return "http://localhost:8000/api";
};

/**
 * Get the base URL without /api path
 * Useful for socket connections, image URLs, etc.
 * @returns Base URL string (e.g., "http://localhost:8000")
 */
export const getBaseUrl = (): string => {
  // In Next.js, NEXT_PUBLIC_ variables are embedded at build time and available via process.env
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) {
    // Trim any whitespace and newlines
    const trimmedUrl = envUrl.trim();
    
    // Remove /api if present, and trailing slashes
    const baseUrl = trimmedUrl.replace('/api', '').replace(/\/$/, '');
    return baseUrl;
  }
  
  // Fallback to localhost
  return "http://localhost:8000";
};

/**
 * Get API base URL (same as getApiUrl, kept for backward compatibility)
 * @deprecated Use getApiUrl() instead
 * Note: This is evaluated at module load time. For dynamic reading, use getApiUrl() function.
 */
export const API_BASE_URL = getApiUrl();
