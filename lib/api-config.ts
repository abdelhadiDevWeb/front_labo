/**
 * API Configuration Utility
 * 
 * Provides consistent API URL handling across the application.
 * Reads from NEXT_PUBLIC_API_URL environment variable.
 * 
 * Usage:
 * - getApiUrl() - Returns full API URL with /api path (e.g., "http://localhost:3001/api")
 * - getBaseUrl() - Returns base URL without /api path (e.g., "http://localhost:3001")
 */

/**
 * Get the full API URL with /api path
 * Reads from NEXT_PUBLIC_API_URL environment variable and adapts for mobile WebView
 * @returns API URL string (e.g., "http://localhost:8000/api" or "http://10.142.140.40:8000/api" in WebView)
 */
export const getApiUrl = (): string => {
  // In Next.js, NEXT_PUBLIC_ variables are embedded at build time and available via process.env
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  let apiUrl: string;
  
  if (envUrl) {
    // Trim any whitespace and newlines
    const trimmedUrl = envUrl.trim();
    
    // If env URL already includes /api, use as is
    if (trimmedUrl.includes('/api')) {
      apiUrl = trimmedUrl;
    } else {
      // Otherwise, append /api
      apiUrl = `${trimmedUrl}/api`;
    }
  } else {
    // Fallback to localhost:8000/api (matching your .env.local)
    apiUrl = "http://localhost:8000/api";
    
    // Log warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ NEXT_PUBLIC_API_URL not found in .env.local, using fallback: http://localhost:8000/api');
      console.warn('💡 To fix: Create client/.env.local file with: NEXT_PUBLIC_API_URL=http://localhost:8000/api');
      console.warn('💡 Then restart Next.js dev server (Ctrl+C and run npm run dev again)');
    }
  }
  
  // In browser/WebView context, adapt the URL for mobile app
  if (typeof window !== 'undefined') {
    const currentHostname = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // If accessing from mobile app WebView (using IP address instead of localhost)
    if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
      // Replace localhost/127.0.0.1 in the API URL with the current hostname
      // This allows the WebView to connect to the backend using the same IP
      apiUrl = apiUrl
        .replace(/http:\/\/localhost/, `${currentProtocol}//${currentHostname}`)
        .replace(/http:\/\/127\.0\.0\.1/, `${currentProtocol}//${currentHostname}`);
    }
  }
  
  return apiUrl;
};

/**
 * Get the base URL without /api path
 * Reads from NEXT_PUBLIC_API_URL and adapts for mobile WebView
 * Useful for socket connections, image URLs, etc.
 * @returns Base URL string (e.g., "http://localhost:8000" or "http://10.142.140.40:8000" in WebView)
 */
export const getBaseUrl = (): string => {
  // In Next.js, NEXT_PUBLIC_ variables are embedded at build time and available via process.env
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  let baseUrl: string;
  
  if (envUrl) {
    // Trim any whitespace and newlines
    const trimmedUrl = envUrl.trim();
    
    // Remove /api if present, and trailing slashes
    baseUrl = trimmedUrl.replace('/api', '').replace(/\/$/, '');
  } else {
    // Fallback to localhost:8000 (matching your .env.local)
    baseUrl = "http://localhost:8000";
  }
  
  // In browser/WebView context, adapt the URL for mobile app
  if (typeof window !== 'undefined') {
    const currentHostname = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // If accessing from mobile app WebView (using IP address instead of localhost)
    if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
      // Replace localhost/127.0.0.1 in the base URL with the current hostname
      // This allows the WebView to connect to the backend using the same IP
      baseUrl = baseUrl
        .replace(/http:\/\/localhost/, `${currentProtocol}//${currentHostname}`)
        .replace(/http:\/\/127\.0\.0\.1/, `${currentProtocol}//${currentHostname}`);
    }
  }
  
  return baseUrl;
};

/**
 * Get API base URL (same as getApiUrl, kept for backward compatibility)
 * @deprecated Use getApiUrl() instead
 * Note: This is evaluated at module load time. For dynamic reading, use getApiUrl() function.
 */
export const API_BASE_URL = getApiUrl();
