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

