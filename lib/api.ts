import { getApiUrl, getBaseUrl } from "./api-config";
import { markSessionActive, markSessionInactive } from "./auth-session";
import { devLog, devError, devWarn } from "./dev-logger";
import { toUserFacingError } from "./sanitize-error";

// Use a getter function instead of a constant to ensure env vars are read dynamically
const getApiBaseUrl = () => getApiUrl();

// Helper function to get appropriate error message based on environment
const getConnectionErrorMessage = (): string => {
  if (process.env.NODE_ENV === "development") {
    const baseUrl = getBaseUrl();
    return `Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré sur ${baseUrl}.`;
  }
  return "Impossible de se connecter au serveur. Veuillez réessayer plus tard.";
};

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  devLog("API Base URL:", getApiBaseUrl());
}

const AUTH_SKIP_REFRESH_PATHS = [
  "/client/refresh-token",
  "/client/logout",
  "/client/login",
  "/client/register",
];

const shouldAttemptRefresh = (url: string): boolean =>
  !AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path));

let refreshInFlight: Promise<boolean> | null = null;

const refreshSession = async (): Promise<boolean> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/client/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (response.ok) {
        markSessionActive();
        return true;
      }

      markSessionInactive();
      return false;
    } catch {
      markSessionInactive();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

/** Authenticated fetch — sends HttpOnly session cookies, auto-refreshes on 401 */
export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  isRetry = false
): Promise<Response> => {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
  });

  if (response.status !== 401 || typeof window === "undefined") {
    return response;
  }

  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (!isRetry && shouldAttemptRefresh(requestUrl)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch(input, init, true);
    }
  }

  markSessionInactive();
  return response;
};

/** Public catalog GET — no cookies, no 401 refresh (faster for visitors / home page). */
const publicFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> =>
  fetch(input, {
    ...init,
    credentials: "omit",
  });

/** @deprecated Tokens are HttpOnly cookies — use checkAuthSession() */
export const getAuthToken = (): string | null => null;

/** @deprecated Tokens are set via HttpOnly cookies by the server */
export const setAuthToken = (_token: string): void => {
  markSessionActive();
};

export const removeAuthToken = (): void => {
  markSessionInactive();
};

/** @deprecated Refresh token is HttpOnly cookie */
export const getRefreshToken = (): string | null => null;

/** @deprecated Refresh token is HttpOnly cookie */
export const setRefreshToken = (_token: string): void => {};

export const checkAuthSession = async (): Promise<boolean> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/role`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      markSessionActive();
      return true;
    }
    markSessionInactive();
    return false;
  } catch {
    markSessionInactive();
    return false;
  }
};

export interface SessionRole {
  role: string;
  email: string;
  id?: string;
}

export const getSessionRole = async (): Promise<SessionRole | null> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/role`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      markSessionInactive();
      return null;
    }
    const result = await response.json();
    if (result.success && result.data) {
      markSessionActive();
      return result.data as SessionRole;
    }
    return null;
  } catch {
    markSessionInactive();
    return null;
  }
};

export const logoutClient = async (): Promise<void> => {
  try {
    await apiFetch(`${getApiBaseUrl()}/client/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    markSessionInactive();
  }
};

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  errors?: string[];
}

export interface ClientRegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  wilaya: string;
  daira?: string;
  commune: string;
  placeId?: string;
  role?: string;
  laboType?: "Labo médical" | "labo d'ana pathologies";
}

export interface ClientLoginData {
  email: string;
  password: string;
}

export interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  wilaya?: string;
  daira?: string;
  commune?: string;
  wilayas?: string[];
  coversAllWilayas?: boolean;
  rip_post?: string;
  rip_bank?: string;
  methode_payment?: string[];
  role?: string;
  status?: boolean;
  laboType?: string;
  onboardingStep?: "upload_documents" | "choose_subscription";
  redirectTo?: string;
}

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    devError("Backend health check failed:", error);
    return false;
  }
};

// Get user profile
export const getProfile = async (): Promise<ApiResponse<ClientData & { createdAt?: string; updatedAt?: string }>> => {
  try {
    const session = await getSessionRole();
    const endpoint = session?.role === "supplier" ? "/supplier/profile" : "/client/profile";

    try {
      const response = await apiFetch(`${getApiBaseUrl()}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch profile",
      };
    }

    const result = await response.json();
    return result;
    } catch (fetchError) {
      devError("Fetch error for endpoint:", endpoint, fetchError);
      // Return error with helpful message
      const isDevelopment = process.env.NODE_ENV === 'development' || getApiBaseUrl().includes('localhost');
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Network error';
      const apiUrl = getApiBaseUrl();
      
      // More detailed error message for local development
      if (isDevelopment) {
        devError(`❌ Failed to connect to: ${apiUrl}${endpoint}`);
        devError(`💡 Make sure:`);
        devError(`   1. Server is running: cd server && bun run dev`);
        devError(`   2. Server is on port 3001`);
        devError(`   3. .env.local exists with: NEXT_PUBLIC_API_URL=http://localhost:3001/api`);
        devError(`   4. Test server directly: http://localhost:3001/api/health`);
      }
      
      return {
        success: false,
        message: isDevelopment
          ? `Network error: ${errorMsg}. Server URL: ${apiUrl}. Check console for details.`
          : `Network error: ${errorMsg}. Please check your connection or contact support.`,
      };
    }
  } catch (error) {
    devError("Get profile error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error. Please check your connection.",
    };
  }
};

// Update user profile
export const updateProfile = async (data: {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}): Promise<ApiResponse<ClientData>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to update profile",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Update profile error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Update password
export const updatePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to update password",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Update password error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Request password reset (send code via email)
export const requestPasswordReset = async (email: string): Promise<ApiResponse<null>> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to send reset code",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Request password reset error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Verify password reset code
export const verifyPasswordResetCode = async (email: string, code: string): Promise<ApiResponse<{ resetToken: string }>> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/verify-reset-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to verify code",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Verify password reset code error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Reset password with verified code
export const resetPassword = async (newPassword: string): Promise<ApiResponse<null>> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to reset password",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Reset password error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Get connected devices
export interface Device {
  id: string;
  name: string;
  type: string;
  browser: string;
  lastActive: string;
  current?: boolean;
}

export const getDevices = async (): Promise<ApiResponse<{ devices: Device[] }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/devices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch devices",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Get devices error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Client Registration API
export const registerClient = async (
  data: ClientRegisterData
): Promise<ApiResponse<ClientData>> => {
  try {
    devLog("Sending request to:", `${getApiBaseUrl()}/client/register`);
    const response = await apiFetch(`${getApiBaseUrl()}/client/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      // Try to parse error response
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `Server error: ${response.status} ${response.statusText}` };
      }
      
      return {
        success: false,
        message: errorData.message || `Registration failed (${response.status})`,
        errors: errorData.errors || [errorData.message || "Unknown error"],
      };
    }

    const result: ApiResponse<ClientData> = await response.json();

    return result;
  } catch (error) {
    devError("Registration error:", error);
    
    // Provide more helpful error messages
    let errorMessage = "Une erreur réseau est survenue.";
    
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      errorMessage = getConnectionErrorMessage();
    } else if (error instanceof Error) {
      errorMessage = toUserFacingError(error.message, errorMessage);
    }
    
    return {
      success: false,
      message: errorMessage,
      errors: [errorMessage],
    };
  }
};

// Client Login API
export const loginClient = async (
  data: ClientLoginData
): Promise<ApiResponse<ClientData>> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      // Try to parse error response
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `Server error: ${response.status} ${response.statusText}` };
      }
      
      return {
        success: false,
        message: errorData.message || `Login failed (${response.status})`,
        errors: errorData.errors || [errorData.message || "Unknown error"],
      };
    }

    const result: any = await response.json();

    if (result.success) {
      markSessionActive();
    } else {
      markSessionInactive();
    }

    return result;
  } catch (error) {
    // Provide more helpful error messages
    let errorMessage = "Une erreur réseau est survenue.";
    
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      errorMessage = getConnectionErrorMessage();
    } else if (error instanceof Error) {
      errorMessage = toUserFacingError(error.message, errorMessage);
    }
    
    return {
      success: false,
      message: errorMessage,
      errors: [errorMessage],
    };
  }
};

// Refresh token API (uses HttpOnly refresh cookie)
export const refreshAuthToken = async (): Promise<ApiResponse<{ token: string }>> => {
  try {
    const refreshed = await refreshSession();
    if (refreshed) {
      return { success: true, message: "Session refreshed" };
    }
    return {
      success: false,
      message: toUserFacingError(undefined, "Session expirée. Veuillez vous reconnecter."),
    };
  } catch {
    return {
      success: false,
      message: toUserFacingError(undefined, "Impossible de rafraîchir la session."),
    };
  }
};

// Product interfaces
export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  category: string;
  deliveryTime: string;
  brand: string;
  productType: "Labo médical" | "labo d'ana pathologies";
  images: string[];
  video?: string;
  wilaya?: string | null;
  daira?: string | null;
  commune?: string | null;
  supplierId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductData {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  category: string;
  deliveryTime: string;
  brand: string;
  productType: "Labo médical" | "labo d'ana pathologies";
  images?: File[];
  video?: File;
}

// Create a single product
export const createProduct = async (
  data: CreateProductData
): Promise<ApiResponse<Product>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Include errors array if available
      return {
        success: false,
        message: errorData.message || "Failed to create product",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Create product error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Upload products from Excel
export const uploadProductsFromExcel = async (
  file: File
): Promise<ApiResponse<{ imported: number; total: number; errors: number; products: Product[] }>> => {
  try {
const formData = new FormData();
    formData.append("excelFile", file);

    const response = await apiFetch(`${getApiBaseUrl()}/products/upload-excel`, {
      method: "POST",
      headers: {},
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to upload Excel file",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Upload Excel error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Get supplier products
export const getSupplierProducts = async (): Promise<ApiResponse<{ products: Product[]; total: number }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/products`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch products",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Get products error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Update a product
export const updateProduct = async (
  productId: string,
  data: Partial<CreateProductData> & { images?: File[]; video?: File }
): Promise<ApiResponse<Product>> => {
  try {
const formData = new FormData();
    
    // Append text fields
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.purchasePrice !== undefined) formData.append("purchasePrice", data.purchasePrice.toString());
    if (data.sellingPrice !== undefined) formData.append("sellingPrice", data.sellingPrice.toString());
    if (data.quantity !== undefined) formData.append("quantity", data.quantity.toString());
    if (data.category !== undefined) formData.append("category", data.category);
    if (data.deliveryTime !== undefined) formData.append("deliveryTime", data.deliveryTime);
    if (data.brand !== undefined) formData.append("brand", data.brand);
    if (data.productType !== undefined) formData.append("productType", data.productType);

    // Append files
    if (data.images && Array.isArray(data.images)) {
      data.images.forEach((image) => {
        formData.append("images", image);
      });
    }
    if (data.video) {
      formData.append("video", data.video);
    }

    const response = await apiFetch(`${getApiBaseUrl()}/products/${productId}`, {
      method: "PUT",
      headers: {},
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to update product",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Update product error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Delete a product
export const deleteProduct = async (productId: string): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/products/${productId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to delete product",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Delete product error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Notification interfaces
export interface NotificationData {
  _id: string;
  idSender: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  idReceiver: string;
  type: "order_status" | "new_order" | "system";
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// Get notifications
export const getNotifications = async (unreadOnly: boolean = true): Promise<ApiResponse<{ notifications: NotificationData[]; unreadCount: number }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/notifications?unreadOnly=${unreadOnly}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch notifications",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Get notifications error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<ApiResponse<NotificationData>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to mark notification as read",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Mark notification as read error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/notifications/read-all`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to mark all notifications as read",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Mark all notifications as read error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Public product interfaces (for clients)
export interface PublicProduct {
  id: string;
  name: string;
  price: number; // selling price
  quantity: number;
  category: string;
  id_catgory?: string | null;
  id_sous_catgory?: string | null;
  deliveryTime: string;
  brand: string;
  productType: "Labo médical" | "labo d'ana pathologies";
  images: string[];
  video?: string;
  wilaya?: string | null;
  daira?: string | null;
  commune?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  supplier: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    certife?: boolean;
    wilayas?: string[];
    coversAllWilayas?: boolean;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SponsoredPublicProduct extends PublicProduct {
  sponsorEndDate: string;
}

export const getSponsoredProducts = async (): Promise<
  ApiResponse<{ products: SponsoredPublicProduct[] }>
> => {
  try {
    const response = await publicFetch(`${getApiBaseUrl()}/sponsored-products`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch sponsored products (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export interface PublicPromotion {
  id: string;
  id_product: string;
  price_discount: number;
  normal_price: number;
  min_quantity: number;
  start_day: string;
  end_day: string;
  discountPercent: number;
  product?: {
    id: string;
    name: string;
    price: number;
    images: string[];
    brand?: string;
    category?: string;
    productType?: string;
    wilaya?: string;
    supplierName?: string;
  };
}

export const getPublicPromotions = async (): Promise<
  ApiResponse<{ promotions: PublicPromotion[] }>
> => {
  try {
    const response = await publicFetch(`${getApiBaseUrl()}/public-promotions`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch promotions (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all products (public - for clients)
export const getAllProducts = async (filters?: {
  categoryId?: string;
  sousCategoryId?: string;
  wilayaCode?: string;
}): Promise<ApiResponse<{ products: PublicProduct[]; total: number; clientWilayaCode?: string | null }>> => {
  try {
const params = new URLSearchParams();
    if (filters?.categoryId) params.append("categoryId", filters.categoryId);
    if (filters?.sousCategoryId) params.append("sousCategoryId", filters.sousCategoryId);
    if (filters?.wilayaCode) params.append("wilayaCode", filters.wilayaCode);
    const query = params.toString() ? `?${params.toString()}` : "";
    
    const response = await publicFetch(`${getApiBaseUrl()}/products/public${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch products",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Get all products error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Get product by ID (public - for clients)
export const getProductById = async (id: string): Promise<ApiResponse<PublicProduct>> => {
  try {
const response = await publicFetch(`${getApiBaseUrl()}/products/public/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch product",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Get product by ID error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Supplier Statistics interfaces
export interface SupplierStatistics {
  totalRevenue: number;
  totalProductsSold: number;
  totalOrders: number;
  totalClients: number;
  ordersByStatus: {
    "en cours": number;
    "on route": number;
    "arrived": number;
  };
  recentOrders: Array<{
    _id: string;
    total: number;
    status: "en cours" | "on route" | "arrived";
    productsCount: number;
    buyer: {
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    createdAt: string;
  }>;
  ordersGrowth: number;
}

// Get supplier statistics
export const getSupplierStatistics = async (): Promise<ApiResponse<SupplierStatistics>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/commandes/supplier/statistics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch statistics",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Get supplier statistics error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Detailed Supplier Statistics interfaces
export interface DetailedSupplierStatistics {
  totalRevenue: number;
  totalProductsSold: number;
  totalOrders: number;
  totalClients: number;
  monthlyRevenue: { [key: string]: number };
  dailyRevenue: { [key: string]: number };
  dailyRevenueMonth?: string;
  bestProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    orders: number;
  }>;
  topCustomers: Array<{
    buyer: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    totalSpent: number;
    ordersCount: number;
    productsCount: number;
  }>;
  ordersByStatus: {
    "en cours": number;
    "on route": number;
    "arrived": number;
  };
  revenueByStatus: {
    "en cours": number;
    "on route": number;
    "arrived": number;
  };
  comparison?: {
    currentMonthRevenue: number;
    previousMonthRevenue: number;
    currentMonthOrders: number;
    previousMonthOrders: number;
    revenueChange: number;
    ordersChange: number;
  };
  topProductsByRevenue?: Array<{
    name: string;
    revenue: number;
  }>;
}

// Get detailed supplier statistics
export const getSupplierDetailedStatistics = async (month?: "current" | "previous"): Promise<ApiResponse<DetailedSupplierStatistics>> => {
  try {
const url = month 
      ? `${getApiBaseUrl()}/commandes/supplier/statistics/detailed?month=${month}`
      : `${getApiBaseUrl()}/commandes/supplier/statistics/detailed`;
    
    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch detailed statistics",
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    devError("Get detailed supplier statistics error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Admin Statistics interfaces
export interface AdminStatistics {
  totalRevenue?: number;
  totalUsers: number;
  totalClients: number;
  totalSuppliers: number;
  totalOrders: number;
  totalProducts?: number;
  totalProblems?: number;
  unreadProblems?: number;
  isLimited?: boolean;
  recentOrders: Array<{
    id: string;
    customer: string;
    supplier: string;
    productCount: number;
    amount: number;
    status: "en cours" | "on route" | "arrived";
    date: string;
  }>;
  growth?: {
    revenue: {
      current: number;
      previous: number;
      percentage: number;
    };
    orders: {
      current: number;
      previous: number;
      percentage: number;
    };
  };
}

export interface DetailedAdminStatistics {
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
  usersByStatus: Array<{
    status: string;
    count: number;
  }>;
  productsByCategory: Array<{
    category: string;
    count: number;
  }>;
  productsByType: Array<{
    type: string;
    count: number;
  }>;
  topSuppliers: Array<{
    supplierName: string;
    totalRevenue: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    name: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
}

// Get admin statistics
export const getAdminStatistics = async (): Promise<ApiResponse<AdminStatistics>> => {
  try {
const url = `${getApiBaseUrl()}/admin/statistics`;
    devLog("Fetching admin statistics from:", url);

    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      devError("Admin statistics error response:", response.status, errorData);
      return {
        success: false,
        message: errorData.message || `Failed to fetch admin statistics (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get admin statistics error:", error);
    devError("Error details:", {
      message: error.message,
      stack: error.stack,
      API_BASE_URL: getApiBaseUrl(),
    });
    return {
      success: false,
      message: error.message || "Network error. Please check your connection and ensure the server is running.",
    };
  }
};

// Get detailed admin statistics for charts
export const getDetailedAdminStatistics = async (): Promise<ApiResponse<DetailedAdminStatistics>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/statistics/detailed`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch detailed statistics (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get detailed admin statistics error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Admin Users interfaces
export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: "client" | "supplier";
  status: boolean;
  certife?: boolean;
  laboType?: string;
  ordersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
  filters: {
    roleCounts: {
      [key: string]: number;
    };
  };
}

// Get all users for admin with filtering
export const getAdminUsers = async (
  filters?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
): Promise<ApiResponse<AdminUsersResponse>> => {
  try {
// Build query string
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const url = `${getApiBaseUrl()}/admin/users${params.toString() ? `?${params.toString()}` : ""}`;

    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch admin users (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get admin users error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Update user status (block/unblock)
export const updateUserStatus = async (
  userId: string,
  status: boolean
): Promise<ApiResponse<{ id: string; status: boolean }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/users/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update user status (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Update user status error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Update supplier certife (admin only)
export const updateUserCertife = async (
  userId: string,
  certife: boolean
): Promise<ApiResponse<{ id: string; certife: boolean }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/users/${userId}/certife`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({ certife }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update certife (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Admin Orders interfaces
export interface AdminOrder {
  id: string;
  orderNumber: string;
  customer: string;
  customerEmail: string;
  supplier: string;
  supplierEmail: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  productCount: number;
  totalAmount: number;
  status: "en cours" | "on route" | "arrived";
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
  filters: {
    statusCounts: {
      [key: string]: number;
    };
  };
}

// Get all orders for admin with filtering
export const getAdminOrders = async (
  filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
): Promise<ApiResponse<AdminOrdersResponse>> => {
  try {
// Build query string
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const url = `${getApiBaseUrl()}/admin/orders${params.toString() ? `?${params.toString()}` : ""}`;
    devLog("Fetching admin orders from:", url);

    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      devError("Admin orders error response:", response.status, errorData);
      return {
        success: false,
        message: errorData.message || `Failed to fetch admin orders (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get admin orders error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection and ensure the server is running.",
    };
  }
};

// Admin Profile interfaces
export interface AdminProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: boolean;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
}

// Get admin profile
export const getAdminProfile = async (): Promise<ApiResponse<AdminProfile>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch admin profile (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get admin profile error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Update admin profile
export const updateAdminProfile = async (data: {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}): Promise<ApiResponse<AdminProfile>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update admin profile (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Update admin profile error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Update admin password
export const updateAdminPassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update password (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Update admin password error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Upload admin profile image
export const uploadAdminProfileImage = async (file: File): Promise<ApiResponse<{ id: string; image: string }>> => {
  try {
const formData = new FormData();
    formData.append("image", file);

    const response = await apiFetch(`${getApiBaseUrl()}/admin/profile-image`, {
      method: "POST",
      headers: {},
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to upload profile image (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Upload admin profile image error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get admin profile image
export const getAdminProfileImage = async (): Promise<ApiResponse<{ id: string; image: string }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/profile-image`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch profile image (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get admin profile image error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Admin Management Interfaces
export interface AdminData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListResponse {
  admins: AdminData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateAdminData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role?: "admin" | "sou-admin";
}

// Get all admins
export const getAllAdmins = async (
  filters?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
): Promise<ApiResponse<AdminListResponse>> => {
  try {
const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const response = await apiFetch(`${getApiBaseUrl()}/admin/admins?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch admins (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get all admins error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Create new admin
export const createAdmin = async (data: CreateAdminData): Promise<ApiResponse<AdminData>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/admins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to create admin (${response.status})`,
        errors: errorData.errors,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Create admin error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Update admin status
export const updateAdminStatus = async (
  adminId: string,
  status: boolean
): Promise<ApiResponse<AdminData>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/admins/${adminId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update admin status (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Update admin status error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Subscription Interfaces
export interface ChosenSubscription {
  userFavId: string;
  typeId: string;
  name: string;
  description?: string;
  time: number;
  price: number;
  sponsorsPerMonth?: number;
}

export interface SubscriptionUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: boolean;
  createdAt: string;
  chosenSubscription?: ChosenSubscription | null;
}

export interface Subscription {
  _id: string;
  id_user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role?: string;
  };
  type: string;
  price: number;
  sponsorsPerMonth?: number;
  sponsorsAllocated?: number;
  start: string;
  end: string;
  status: "active" | "ended";
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionData {
  id_user: string;
  typeId?: string; // New: subscription type ID (preferred)
  type?: string; // Old: subscription type name (for backward compatibility)
  price?: number; // Optional if typeId is provided
  start: string;
  end?: string; // Optional if typeId is provided (will be auto-calculated)
}

export interface UpdateSubscriptionData {
  type?: string;
  price?: number;
  start?: string;
  end?: string;
}

// Get users with status false for subscriptions
export const getUsersForSubscription = async (): Promise<ApiResponse<{ users: SubscriptionUser[] }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscriptions/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch users (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get users for subscription error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Create subscription
export const createSubscription = async (data: CreateSubscriptionData): Promise<ApiResponse<Subscription>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to create subscription (${response.status})`,
        errors: errorData.errors,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Create subscription error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Activate subscription from user's hand-to-hand choice (user_fav)
export const activateSubscriptionFromUserChoice = async (
  userId: string
): Promise<ApiResponse<Subscription>> => {
  try {
const response = await apiFetch(
      `${getApiBaseUrl()}/admin/subscriptions/users/${userId}/activate-choice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",},
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to activate subscription (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error. Please check your connection.",
    };
  }
};

// Get all subscriptions
export const getAllSubscriptions = async (): Promise<ApiResponse<{ subscriptions: Subscription[] }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscriptions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch subscriptions (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get all subscriptions error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Update subscription
export const updateSubscription = async (
  subscriptionId: string,
  data: UpdateSubscriptionData
): Promise<ApiResponse<Subscription>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscriptions/${subscriptionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update subscription (${response.status})`,
        errors: errorData.errors,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Update subscription error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Subscription Type Interfaces
export interface SubscriptionType {
  id: string;
  name: string;
  description?: string;
  time: number; // Duration in days
  price: number;
  sponsorsPerMonth?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionTypeData {
  name: string;
  description?: string;
  time: number;
  price: number;
  sponsorsPerMonth?: number;
}

export interface UpdateSubscriptionTypeData {
  name?: string;
  description?: string;
  time?: number;
  price?: number;
  sponsorsPerMonth?: number;
}

// Get all subscription types
export const getAllSubscriptionTypes = async (): Promise<ApiResponse<{ subscriptionTypes: SubscriptionType[] }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscription-types`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch subscription types (${response.status})`,
      };
    }

    const result = await response.json();
    // Transform _id to id for consistency
    if (result.success && result.data && result.data.subscriptionTypes) {
      result.data.subscriptionTypes = result.data.subscriptionTypes.map((type: any) => ({
        ...type,
        id: type.id || type._id?.toString() || type._id,
      }));
    }
    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Create subscription type
export const createSubscriptionType = async (data: CreateSubscriptionTypeData): Promise<ApiResponse<SubscriptionType>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscription-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to create subscription type (${response.status})`,
        errors: errorData.errors,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Update subscription type
export const updateSubscriptionType = async (
  typeId: string,
  data: UpdateSubscriptionTypeData
): Promise<ApiResponse<SubscriptionType>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscription-types/${typeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update subscription type (${response.status})`,
        errors: errorData.errors,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Delete subscription type
export const deleteSubscriptionType = async (typeId: string): Promise<ApiResponse<void>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscription-types/${typeId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to delete subscription type (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Sponsor Interfaces
export interface Sponsor {
  id: string;
  time: number;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSponsorData {
  time: number;
  price: number;
}

export interface UpdateSponsorData {
  time?: number;
  price?: number;
}

export const getAllSponsors = async (): Promise<ApiResponse<{ sponsors: Sponsor[] }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/sponsors`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch sponsors (${response.status})`,
      };
    }

    const result = await response.json();
    if (result.success && result.data?.sponsors) {
      result.data.sponsors = result.data.sponsors.map((sponsor: any) => ({
        ...sponsor,
        id: sponsor.id || sponsor._id?.toString() || sponsor._id,
      }));
    }
    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const createSponsor = async (data: CreateSponsorData): Promise<ApiResponse<Sponsor>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/sponsors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to create sponsor (${response.status})`,
        errors: errorData.errors,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const updateSponsor = async (
  sponsorId: string,
  data: UpdateSponsorData
): Promise<ApiResponse<Sponsor>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/sponsors/${sponsorId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to update sponsor (${response.status})`,
        errors: errorData.errors,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const deleteSponsor = async (sponsorId: string): Promise<ApiResponse<void>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/sponsors/${sponsorId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to delete sponsor (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Sponsor plan (admin-defined packs)
export interface SponsorPlan {
  id: string;
  time: number;
  price: number;
}

export interface SponsorProductRecord {
  id: string;
  id_plan_sponsor?: string;
  id_abonnement?: string;
  id_product: string;
  id_supplier: string;
  source?: "vip" | "subscription";
  start_time: string;
  end_time: string;
  price: number;
  time: number;
  payment_status: boolean;
  isActive?: boolean;
  chargily_checkout_id?: string;
  chargily_checkout_url?: string;
  product?: {
    id: string;
    name: string;
    images?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionSponsorQuota {
  hasActiveAbonnement: boolean;
  abonnement: {
    id: string;
    type: string;
    sponsorsPerMonth: number;
    sponsorsAllocated?: number;
    start: string;
    end: string;
    isActive: boolean;
  } | null;
  sponsorsAllocated: number;
  sponsorsRemaining: number;
  sponsorsUsed: number;
  remaining: number;
  canCreateSubscriptionSponsor: boolean;
  /** @deprecated use sponsorsUsed */
  usedThisMonth?: number;
}

export const getSubscriptionSponsorQuota = async (): Promise<
  ApiResponse<SubscriptionSponsorQuota>
> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/sponsor-products/subscription-quota`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `Failed to fetch subscription quota (${response.status})`,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const createSubscriptionSponsorProduct = async (data: {
  id_product: string;
}): Promise<
  ApiResponse<{ sponsorProduct: SponsorProductRecord; quota: SubscriptionSponsorQuota }>
> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/sponsor-products/subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `Failed to create subscription sponsor (${response.status})`,
        errors: result.errors,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const getSponsorPlans = async (): Promise<ApiResponse<{ plans: SponsorPlan[] }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/sponsor-products/plans`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch sponsor plans (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const getSupplierSponsorProducts = async (): Promise<
  ApiResponse<{
    sponsorProducts: SponsorProductRecord[];
    activeProductIds: string[];
    subscriptionQuota?: SubscriptionSponsorQuota;
  }>
> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/sponsor-products`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch sponsor products (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const createSponsorProduct = async (data: {
  id_plan_sponsor: string;
  id_product: string;
}): Promise<
  ApiResponse<{ sponsorProduct: SponsorProductRecord; checkoutUrl: string }>
> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/sponsor-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `Failed to create sponsor product (${response.status})`,
        errors: result.errors,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const verifySponsorProductPayment = async (
  sponsorProductId: string
): Promise<ApiResponse<{ sponsorProduct: SponsorProductRecord; paid: boolean }>> => {
  try {
const response = await apiFetch(
      `${getApiBaseUrl()}/sponsor-products/${sponsorProductId}/verify-payment`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",},
      }
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `Failed to verify payment (${response.status})`,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const resumeSponsorPayment = async (
  sponsorProductId: string
): Promise<
  ApiResponse<{
    sponsorProduct: SponsorProductRecord;
    checkoutUrl: string | null;
    paid: boolean;
  }>
> => {
  try {
const response = await apiFetch(
      `${getApiBaseUrl()}/sponsor-products/${sponsorProductId}/resume-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",},
      }
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `Failed to resume payment (${response.status})`,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Promotion interfaces (supplier discounts)
export interface Promotion {
  id: string;
  id_product: string;
  id_supplier: string;
  price_discount: number;
  normal_price: number;
  min_quantity: number;
  start_day: string;
  end_day: string;
  isActive?: boolean;
  product?: {
    id: string;
    name: string;
    sellingPrice: number;
    images?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePromotionData {
  id_product: string;
  price_discount: number;
  normal_price: number;
  min_quantity: number;
  start_day: string;
  end_day: string;
}

export interface UpdatePromotionData {
  id_product?: string;
  price_discount?: number;
  normal_price?: number;
  min_quantity?: number;
  start_day?: string;
  end_day?: string;
}

export const getSupplierPromotions = async (): Promise<ApiResponse<{ promotions: Promotion[] }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/promotions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch promotions (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const createPromotion = async (data: CreatePromotionData): Promise<ApiResponse<Promotion>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/promotions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `Failed to create promotion (${response.status})`,
        errors: result.errors,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const updatePromotion = async (
  promotionId: string,
  data: UpdatePromotionData
): Promise<ApiResponse<Promotion>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/promotions/${promotionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `Failed to update promotion (${response.status})`,
        errors: result.errors,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

export const deletePromotion = async (promotionId: string): Promise<ApiResponse<void>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/promotions/${promotionId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to delete promotion (${response.status})`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// User Papers and Documents Interfaces
export interface UserPapers {
  _id: string;
  id_user: string;
  type: string;
  Tax_number?: string;
  identity: string;
  commercial_register?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDocuments {
  _id: string;
  id_user: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

// Get user papers (Papier)
export const getUserPapers = async (userId: string): Promise<ApiResponse<{ papers: UserPapers | null }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscriptions/users/${userId}/papers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch papers (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get user papers error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get user documents (Attachment)
export const getUserDocuments = async (userId: string): Promise<ApiResponse<{ documents: UserDocuments | null }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/subscriptions/users/${userId}/documents`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch documents (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get user documents error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Payment interfaces
export interface Payment {
  _id: string;
  id_commande: string;
  id_owner: string;
  total: number;
  image: string;
  createdAt: string;
  updatedAt: string;
}

// Create payment (upload payment proof)
export const createPayment = async (
  commandeId: string,
  total: number,
  imageFile: File
): Promise<ApiResponse<Payment>> => {
  try {
const formData = new FormData();
    formData.append("id_commande", commandeId);
    // Convert total to string for FormData
    formData.append("total", total.toString());
    formData.append("image", imageFile);

    const response = await apiFetch(`${getApiBaseUrl()}/payments`, {
      method: "POST",
      headers: {},
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to upload payment proof",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Create payment error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get payment by commande ID
export const getPaymentByCommande = async (commandeId: string): Promise<ApiResponse<Payment>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/payments/commande/${commandeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch payment",
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get payment by commande error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all payments for current user
export const getUserPayments = async (): Promise<ApiResponse<Payment[]>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/payments/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch payments",
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get user payments error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Supplier Details interfaces
export interface SupplierDetails {
  supplier: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    status: boolean;
    certife?: boolean;
    profileImage: string | null;
    rip_post?: string;
    rip_bank?: string;
    methode_payment?: string[];
    createdAt: string;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    displayedProducts: number;
  };
  products: Array<{
    _id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    brand: string;
    productType: string;
    images: string[];
    createdAt: string;
  }>;
}

export interface SupplierCard {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  certife?: boolean;
  profileImage: string | null;
  productsCount: number;
}

// Get supplier details by ID (public)
export const getSupplierDetails = async (supplierId: string): Promise<ApiResponse<SupplierDetails>> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/supplier/${supplierId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch supplier details",
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get supplier details error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all suppliers (public, with optional auth for laboType filtering)
export const getAllSuppliersPublic = async (): Promise<ApiResponse<{ suppliers: SupplierCard[]; total: number }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/supplier/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch suppliers",
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Add supplier to favorites (client)
export const addSupplierToFavorites = async (supplierId: string): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/favorites/suppliers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({ supplierId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to add supplier to favorites",
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Remove supplier from favorites (client)
export const removeSupplierFromFavorites = async (supplierId: string): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/favorites/suppliers/${supplierId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to remove supplier from favorites",
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get current client favorite suppliers
export const getFavoriteSuppliers = async (): Promise<ApiResponse<{ suppliers: SupplierCard[]; total: number }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/favorites/suppliers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch favorite suppliers",
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Problem interfaces
export interface Problem {
  _id: string;
  email: string;
  phone: string;
  message: string;
  is_read: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create support problem (public)
export const createProblem = async (data: {
  email: string;
  phone: string;
  message: string;
}): Promise<ApiResponse<Problem>> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to submit problem",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Create problem error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all problems (admin only)
export const getAllProblems = async (): Promise<ApiResponse<Problem[]>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/problems`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch problems",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get all problems error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Mark problem as read (admin only)
export const markProblemAsRead = async (problemId: string): Promise<ApiResponse<Problem>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/problems/${problemId}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to mark problem as read",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Mark problem as read error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Rate interfaces
export interface Rate {
  id: string;
  rater: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  message: string;
  number: number;
  createdAt: string;
}

export interface SupplierRatingsResponse {
  ratings: Rate[];
  averageRating: string;
  totalRatings: number;
}

export interface CanRateResponse {
  canRate: boolean;
  hasRated: boolean;
  existingRate: {
    id: string;
    message: string;
    number: number;
    createdAt: string;
  } | null;
}

// Create a rating for a supplier
export const createRate = async (
  supplierId: string,
  message: string,
  number: number
): Promise<ApiResponse<Rate>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({
        id_supplier: supplierId,
        message: message.trim(),
        number: number,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to create rating",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Create rate error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all ratings for a supplier
export const getSupplierRatings = async (supplierId: string): Promise<ApiResponse<SupplierRatingsResponse>> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/client/rates/supplier/${supplierId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch ratings",
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Get supplier ratings error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Check if user can rate a supplier
export const canRateSupplier = async (supplierId: string): Promise<ApiResponse<CanRateResponse>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/rates/can-rate/${supplierId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to check rating status",
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Check can rate supplier error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Save FCM token for push notifications
export const saveFcmToken = async (token: string): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/client/fcm-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to save FCM token",
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    devError("Save FCM token error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Category interfaces
export interface SousCategory {
  id: string;
  name_sou_catgory: string;
  id_catgory: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name_catgory: string;
  image: string;
  des: string;
  createdAt: string;
  updatedAt: string;
  sousCategories: SousCategory[];
}

export interface CreateCategoryData {
  name_catgory: string;
  des: string;
  image: File;
}

export interface UpdateCategoryData {
  name_catgory?: string;
  des?: string;
  image?: File;
}

export interface CreateSousCategoryData {
  name_sou_catgory: string;
  image: File;
}

export interface UpdateSousCategoryData {
  name_sou_catgory?: string;
  id_catgory?: string;
  image?: File;
}

export const getPublicCategories = async (): Promise<ApiResponse<{ categories: Category[]; total: number }>> => {
  try {
    const response = await publicFetch(`${getApiBaseUrl()}/categories/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to fetch categories" };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const getPublicCategoryById = async (categoryId: string): Promise<ApiResponse<Category>> => {
  try {
    const response = await publicFetch(`${getApiBaseUrl()}/categories/public/${categoryId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to fetch category" };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const getAllCategories = async (): Promise<ApiResponse<{ categories: Category[]; total: number }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/categories`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to fetch categories" };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const createCategory = async (data: CreateCategoryData): Promise<ApiResponse<Category>> => {
  try {
const formData = new FormData();
    formData.append("name_catgory", data.name_catgory);
    formData.append("des", data.des);
    formData.append("image", data.image);

    const response = await apiFetch(`${getApiBaseUrl()}/admin/categories`, {
      method: "POST",
body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to create category", errors: errorData.errors };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const updateCategory = async (categoryId: string, data: UpdateCategoryData): Promise<ApiResponse<Category>> => {
  try {
const formData = new FormData();
    if (data.name_catgory) formData.append("name_catgory", data.name_catgory);
    if (data.des) formData.append("des", data.des);
    if (data.image) formData.append("image", data.image);

    const response = await apiFetch(`${getApiBaseUrl()}/admin/categories/${categoryId}`, {
      method: "PUT",
body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to update category", errors: errorData.errors };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const deleteCategory = async (categoryId: string): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/categories/${categoryId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to delete category" };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const createSousCategory = async (
  categoryId: string,
  data: CreateSousCategoryData
): Promise<ApiResponse<SousCategory>> => {
  try {
const formData = new FormData();
    formData.append("name_sou_catgory", data.name_sou_catgory);
    formData.append("image", data.image);

    const response = await apiFetch(`${getApiBaseUrl()}/admin/categories/${categoryId}/sous-categories`, {
      method: "POST",
body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to create sub-category", errors: errorData.errors };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const updateSousCategory = async (
  sousCategoryId: string,
  data: UpdateSousCategoryData
): Promise<ApiResponse<SousCategory>> => {
  try {
const formData = new FormData();
    if (data.name_sou_catgory) formData.append("name_sou_catgory", data.name_sou_catgory);
    if (data.id_catgory) formData.append("id_catgory", data.id_catgory);
    if (data.image) formData.append("image", data.image);

    const response = await apiFetch(`${getApiBaseUrl()}/admin/categories/sous-categories/${sousCategoryId}`, {
      method: "PUT",
body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to update sub-category", errors: errorData.errors };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

export const deleteSousCategory = async (sousCategoryId: string): Promise<ApiResponse<null>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/admin/categories/sous-categories/${sousCategoryId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || "Failed to delete sub-category" };
    }

    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check your connection." };
  }
};

// Public subscription plans (post-registration)
export const getPublicSubscriptionPlans = async (): Promise<
  ApiResponse<{ subscriptionTypes: SubscriptionType[] }>
> => {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/abonnements/plans`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || `Failed to fetch plans (${response.status})`,
      };
    }

    const result = await response.json();
    if (result.success && result.data?.subscriptionTypes) {
      result.data.subscriptionTypes = result.data.subscriptionTypes.map((type: SubscriptionType & { _id?: string }) => ({
        ...type,
        id: type.id || type._id?.toString() || "",
      }));
    }
    return result;
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error. Please check your connection.",
    };
  }
};

export const createAbonnementCheckout = async (
  typeId: string
): Promise<ApiResponse<{ paymentId: string; checkoutUrl: string }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/abonnements/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({ typeId }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: result.message || "Échec de la création du paiement" };
    }
    return result;
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error. Please check your connection.",
    };
  }
};

export const registerHandToHandAbonnement = async (
  typeId: string
): Promise<ApiResponse<{ paymentId: string; planName: string }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/abonnements/hand-to-hand`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",},
      body: JSON.stringify({ typeId }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: result.message || "Échec de l'enregistrement" };
    }
    return result;
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error. Please check your connection.",
    };
  }
};

export const verifyAbonnementPayment = async (
  paymentId: string
): Promise<ApiResponse<{ paid: boolean; abonnementId?: string; checkoutStatus?: string }>> => {
  try {
const response = await apiFetch(`${getApiBaseUrl()}/abonnements/payments/${paymentId}/verify`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",},
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: result.message || "Échec de la vérification" };
    }
    return result;
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error. Please check your connection.",
    };
  }
};
