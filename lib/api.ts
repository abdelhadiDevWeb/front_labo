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

    const response = await fetch(`${API_BASE_URL}/client/profile`, {
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
  } catch (error) {
    console.error("Get profile error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
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

    const result: ApiResponse<ClientData> = await response.json();

    // Store token if provided
    if (result.token) {
      setAuthToken(result.token);
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
