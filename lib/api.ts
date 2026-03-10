const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Log API URL on module load (for debugging)
if (typeof window !== "undefined") {
  console.log("API Base URL:", API_BASE_URL);
}

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
  role?: string;
  status?: boolean;
}

// Helper function to get auth token from localStorage
export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken");
  }
  return null;
};

// Helper function to set auth token in localStorage
export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", token);
  }
};

// Helper function to remove auth token from localStorage
export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }
};

// Helper function to get refresh token from localStorage
export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken");
  }
  return null;
};

// Helper function to set refresh token in localStorage
export const setRefreshToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("refreshToken", token);
  }
};

// Health check function to test backend connection
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
};

// Get user profile
export const getProfile = async (): Promise<ApiResponse<ClientData & { createdAt?: string; updatedAt?: string }>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    // Detect user role from token
    let userRole: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userRole = payload.role;
    } catch (decodeError) {
      console.error("Error decoding token:", decodeError);
      // Continue with default endpoint
    }

    // Use appropriate endpoint based on role
    const endpoint = userRole === "supplier" ? "/supplier/profile" : "/client/profile";
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
      console.error("Fetch error for endpoint:", endpoint, fetchError);
      // Return error with helpful message
      return {
        success: false,
        message: fetchError instanceof Error 
          ? `Network error: ${fetchError.message}. Please check if the server is running at ${API_BASE_URL}`
          : `Network error. Please check if the server is running at ${API_BASE_URL}`,
      };
    }
  } catch (error) {
    console.error("Get profile error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/client/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update profile error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/client/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update password error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Request password reset (send code via email)
export const requestPasswordReset = async (email: string): Promise<ApiResponse<null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/client/forgot-password`, {
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
    console.error("Request password reset error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Verify password reset code
export const verifyPasswordResetCode = async (email: string, code: string): Promise<ApiResponse<{ resetToken: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/client/verify-reset-code`, {
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
    console.error("Verify password reset code error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Reset password with verified code
export const resetPassword = async (resetToken: string, newPassword: string): Promise<ApiResponse<null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/client/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resetToken, newPassword }),
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
    console.error("Reset password error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/client/devices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get devices error:", error);
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
    console.log("Sending request to:", `${API_BASE_URL}/client/register`);
    const response = await fetch(`${API_BASE_URL}/client/register`, {
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

    // Store token if provided
    if (result.token) {
      setAuthToken(result.token);
    }

    return result;
  } catch (error) {
    console.error("Registration error:", error);
    
    // Provide more helpful error messages
    let errorMessage = "Une erreur réseau est survenue.";
    
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      errorMessage = `Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré sur ${API_BASE_URL.replace('/api', '')}. Ouvrez un terminal et exécutez: cd server && bun run dev`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
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
    console.log("Sending request to:", `${API_BASE_URL}/client/login`);
    const response = await fetch(`${API_BASE_URL}/client/login`, {
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

    // Store tokens if provided
    if (result.token) {
      setAuthToken(result.token);
    }
    if (result.refreshToken) {
      setRefreshToken(result.refreshToken);
    }

    return result;
  } catch (error) {
    console.error("Login error:", error);
    
    // Provide more helpful error messages
    let errorMessage = "Une erreur réseau est survenue.";
    
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      errorMessage = `Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré sur ${API_BASE_URL.replace('/api', '')}. Ouvrez un terminal et exécutez: cd server && bun run dev`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
      errors: [errorMessage],
    };
  }
};

// Refresh token API
export const refreshAuthToken = async (): Promise<ApiResponse<{ token: string }>> => {
  try {
    const refreshTokenValue = getRefreshToken();
    if (!refreshTokenValue) {
      return {
        success: false,
        message: "No refresh token available",
      };
    }

    const response = await fetch(`${API_BASE_URL}/client/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // If refresh token is invalid, remove tokens
      if (response.status === 401) {
        removeAuthToken();
      }
      return {
        success: false,
        message: errorData.message || "Failed to refresh token",
        errors: errorData.errors || [],
      };
    }

    const result = await response.json();

    // Store new token
    if (result.token) {
      setAuthToken(result.token);
    }

    return result;
  } catch (error) {
    console.error("Refresh token error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Create product error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const formData = new FormData();
    formData.append("excelFile", file);

    const response = await fetch(`${API_BASE_URL}/products/upload-excel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Upload Excel error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Get supplier products
export const getSupplierProducts = async (): Promise<ApiResponse<{ products: Product[]; total: number }>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
    console.error("Get products error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

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

    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update product error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Delete a product
export const deleteProduct = async (productId: string): Promise<ApiResponse<null>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Delete product error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/notifications?unreadOnly=${unreadOnly}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get notifications error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<ApiResponse<NotificationData>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Mark notification as read error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<ApiResponse<null>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Mark all notifications as read error:", error);
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
  deliveryTime: string;
  brand: string;
  productType: "Labo médical" | "labo d'ana pathologies";
  images: string[];
  video?: string;
  supplier: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

// Get all products (public - for clients)
export const getAllProducts = async (): Promise<ApiResponse<{ products: PublicProduct[]; total: number }>> => {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    // Include auth token if available (for laboType filtering)
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/products/public`, {
      method: "GET",
      headers,
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
    console.error("Get all products error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Get product by ID (public - for clients)
export const getProductById = async (id: string): Promise<ApiResponse<PublicProduct>> => {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    // Include auth token if available (for laboType filtering)
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/products/public/${id}`, {
      method: "GET",
      headers,
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
    console.error("Get product by ID error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/commandes/supplier/statistics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get supplier statistics error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const url = month 
      ? `${API_BASE_URL}/commandes/supplier/statistics/detailed?month=${month}`
      : `${API_BASE_URL}/commandes/supplier/statistics/detailed`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get detailed supplier statistics error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

// Admin Statistics interfaces
export interface AdminStatistics {
  totalRevenue: number;
  totalUsers: number;
  totalClients: number;
  totalSuppliers: number;
  totalOrders: number;
  totalProducts: number;
  recentOrders: Array<{
    id: string;
    customer: string;
    supplier: string;
    productCount: number;
    amount: number;
    status: "en cours" | "on route" | "arrived";
    date: string;
  }>;
  growth: {
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const url = `${API_BASE_URL}/admin/statistics`;
    console.log("Fetching admin statistics from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Admin statistics error response:", response.status, errorData);
      return {
        success: false,
        message: errorData.message || `Failed to fetch admin statistics (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Get admin statistics error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      API_BASE_URL,
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/statistics/detailed`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get detailed admin statistics error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    // Build query string
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const url = `${API_BASE_URL}/admin/users${params.toString() ? `?${params.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get admin users error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update user status error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    // Build query string
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const url = `${API_BASE_URL}/admin/orders${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("Fetching admin orders from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Admin orders error response:", response.status, errorData);
      return {
        success: false,
        message: errorData.message || `Failed to fetch admin orders (${response.status})`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Get admin orders error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get admin profile error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update admin profile error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update admin password error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Upload admin profile image
export const uploadAdminProfileImage = async (file: File): Promise<ApiResponse<{ id: string; image: string }>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/admin/profile-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Upload admin profile image error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get admin profile image
export const getAdminProfileImage = async (): Promise<ApiResponse<{ id: string; image: string }>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/profile-image`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get admin profile image error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const response = await fetch(`${API_BASE_URL}/admin/admins?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get all admins error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Create new admin
export const createAdmin = async (data: CreateAdminData): Promise<ApiResponse<AdminData>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/admins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Create admin error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/admins/${adminId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update admin status error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Subscription Interfaces
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
}

export interface Subscription {
  _id: string;
  id_user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  type: string;
  price: number;
  start: string;
  end: string;
  status: "active" | "ended";
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionData {
  id_user: string;
  type: string;
  price: number;
  start: string;
  end: string;
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/subscriptions/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get users for subscription error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Create subscription
export const createSubscription = async (data: CreateSubscriptionData): Promise<ApiResponse<Subscription>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Create subscription error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all subscriptions
export const getAllSubscriptions = async (): Promise<ApiResponse<{ subscriptions: Subscription[] }>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/subscriptions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get all subscriptions error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/subscriptions/${subscriptionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Update subscription error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/subscriptions/users/${userId}/papers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get user papers error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get user documents (Attachment)
export const getUserDocuments = async (userId: string): Promise<ApiResponse<{ documents: UserDocuments | null }>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/subscriptions/users/${userId}/documents`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get user documents error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const formData = new FormData();
    formData.append("id_commande", commandeId);
    // Convert total to string for FormData
    formData.append("total", total.toString());
    formData.append("image", imageFile);

    const response = await fetch(`${API_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Create payment error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get payment by commande ID
export const getPaymentByCommande = async (commandeId: string): Promise<ApiResponse<Payment>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/payments/commande/${commandeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get payment by commande error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all payments for current user
export const getUserPayments = async (): Promise<ApiResponse<Payment[]>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/payments/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get user payments error:", error);
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

// Get supplier details by ID (public)
export const getSupplierDetails = async (supplierId: string): Promise<ApiResponse<SupplierDetails>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/supplier/${supplierId}`, {
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
    console.error("Get supplier details error:", error);
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
    const response = await fetch(`${API_BASE_URL}/client/support`, {
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
    console.error("Create problem error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all problems (admin only)
export const getAllProblems = async (): Promise<ApiResponse<Problem[]>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/problems`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Get all problems error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Mark problem as read (admin only)
export const markProblemAsRead = async (problemId: string): Promise<ApiResponse<Problem>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/problems/${problemId}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Mark problem as read error:", error);
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
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/client/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Create rate error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Get all ratings for a supplier
export const getSupplierRatings = async (supplierId: string): Promise<ApiResponse<SupplierRatingsResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/client/rates/supplier/${supplierId}`, {
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
    console.error("Get supplier ratings error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};

// Check if user can rate a supplier
export const canRateSupplier = async (supplierId: string): Promise<ApiResponse<CanRateResponse>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
      };
    }

    const response = await fetch(`${API_BASE_URL}/client/rates/can-rate/${supplierId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    console.error("Check can rate supplier error:", error);
    return {
      success: false,
      message: error.message || "Network error. Please check your connection.",
    };
  }
};
