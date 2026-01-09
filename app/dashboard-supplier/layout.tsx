"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  FileText,
  BarChart3,
  User,
  ShoppingCart,
  CreditCard,
  Menu,
  X,
  LogOut,
  Settings,
  Mail,
  Phone,
  MapPin,
  Bell,
  ChevronDown,
} from "lucide-react";
import { getAuthToken, getProfile, ClientData } from "@/lib/api";
import { io as socketIO } from "socket.io-client";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard-supplier" },
  { icon: Package, label: "Mes Produits", href: "/dashboard-supplier/products" },
  { icon: FileText, label: "Ajouter Produit", href: "/dashboard-supplier/add-product" },
  { icon: ShoppingCart, label: "Commandes", href: "/dashboard-supplier/orders" },
  { icon: BarChart3, label: "Statistiques", href: "/dashboard-supplier/statistics" },
  { icon: User, label: "Profil", href: "/dashboard-supplier/profile" },
];

export default function SupplierDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<ClientData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    orderId: string;
    total: number;
    buyerName: string;
    productsCount: number;
    createdAt: Date;
    read: boolean;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadUserData = async () => {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // Decode token to get role
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const role = payload.role;
        setUserRole(role);

        // Check if user is supplier
        if (role !== "supplier") {
          router.push("/home");
          return;
        }

        setIsAuthenticated(true);

        // Fetch user profile data
        const profileResult = await getProfile();
        if (profileResult.success && profileResult.data) {
          setUserData(profileResult.data);
        }

        // Load profile image
        await loadProfileImage();
      } catch (error) {
        console.error("Error decoding token:", error);
        router.push("/login");
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserData();
  }, [router]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Socket.io connection for real-time notifications
  useEffect(() => {
    const token = getAuthToken();
    if (!token || !isAuthenticated || userRole !== "supplier") return;

    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000", {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.io server");
    });

    socket.on("newOrder", (data: {
      orderId: string;
      total: number;
      buyerName: string;
      productsCount: number;
      createdAt: string;
    }) => {
      const newNotification = {
        id: Date.now().toString(),
        orderId: data.orderId,
        total: data.total,
        buyerName: data.buyerName,
        productsCount: data.productsCount,
        createdAt: new Date(data.createdAt),
        read: false,
      };
      
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Show browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Nouvelle commande", {
          body: `Nouvelle commande de ${data.buyerName} - ${data.total.toFixed(2)} DA`,
          icon: "/favicon.ico",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.io server");
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, userRole]);

  const loadProfileImage = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${API_BASE_URL}/supplier/profile-image`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");
          const imagePath = result.data.image.startsWith("/") ? result.data.image.slice(1) : result.data.image;
          setProfileImage(`${API_BASE}/${imagePath}`);
        } else {
          // If no image found, clear the profile image
          setProfileImage(null);
        }
      } else {
        // If 404 or error, clear the profile image
        setProfileImage(null);
      }
    } catch (err) {
      console.error("Load profile image error:", err);
      setProfileImage(null);
    }
  };

  // Listen for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = () => {
      loadProfileImage();
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-dropdown-container')) {
          setUserDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  if (!isAuthenticated || userRole !== "supplier") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/dashboard-supplier" className="flex items-center gap-2">
              <Image
                src="/images/logo.jpeg"
                alt="Market Lab Logo"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50"
                          : "text-gray-700 hover:bg-gray-100 hover:text-green-600"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Link
              href="/dashboard-supplier/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Paramètres</span>
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("authToken");
                router.push("/login");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {menuItems.find((item) => item.href === pathname)?.label || "Dashboard Fournisseur"}
              </h1>
            </div>

            {/* User Info Section */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) {
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, read: true }))
                      );
                      setUnreadCount(0);
                    }
                  }}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <Bell className="w-5 h-5 text-gray-600 group-hover:text-green-600 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fade-in-up max-h-96 overflow-y-auto">
                      <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                        <h3 className="font-bold text-lg">Notifications</h3>
                        <p className="text-sm text-green-100">
                          {notifications.length} notification{notifications.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>Aucune notification</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                                !notification.read ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                router.push(`/dashboard-supplier/orders`);
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <ShoppingCart className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">
                                    Nouvelle commande
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    De {notification.buyerName}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {notification.productsCount} produit{notification.productsCount > 1 ? "s" : ""} • {notification.total.toFixed(2)} DA
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.createdAt).toLocaleString("fr-FR")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Profile Dropdown */}
              <div className="relative user-dropdown-container">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : userData ? (
                      <span className="text-white font-semibold text-sm">
                        {userData.firstName.charAt(0)}{userData.lastName.charAt(0)}
                      </span>
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    {isLoadingUser ? (
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    ) : userData ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900">
                          {userData.firstName} {userData.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{userData.email}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Chargement...</p>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-600 transition-transform ${
                      userDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fade-in-up">
                      {/* User Info Header */}
                      {userData && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                              {profileImage ? (
                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white font-semibold">
                                  {userData.firstName.charAt(0)}{userData.lastName.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {userData.firstName} {userData.lastName}
                              </p>
                              <p className="text-sm text-gray-600 truncate">{userData.email}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* User Details */}
                      {userData && (
                        <div className="p-4 space-y-3 border-b border-gray-200">
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{userData.phone || "Non renseigné"}</span>
                          </div>
                          <div className="flex items-start gap-3 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 line-clamp-2">{userData.address || "Non renseigné"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{userData.email}</span>
                          </div>
                        </div>
                      )}

                      {/* Menu Items */}
                      <div className="p-2">
                        <Link
                          href="/dashboard-supplier/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <User className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium">Mon Profil</span>
                        </Link>
                        <Link
                          href="/dashboard-supplier/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Settings className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium">Paramètres</span>
                        </Link>
                        <button
                          onClick={() => {
                            localStorage.removeItem("authToken");
                            router.push("/login");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-2"
                        >
                          <LogOut className="w-5 h-5" />
                          <span className="text-sm font-medium">Déconnexion</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

