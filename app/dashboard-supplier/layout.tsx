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
  Mail,
  Phone,
  MapPin,
  Bell,
  ChevronDown,
  MessageCircle,
  Send,
  CheckCircle,
  Percent,
  Users,
} from "lucide-react";
import { getSessionRole, getProfile, ClientData, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, NotificationData, createProblem, apiFetch } from "@/lib/api";
import { performLogout } from "@/lib/perform-logout";
import { setupNativeFcmBridge } from "@/lib/fcm-bridge";
import { io as socketIO } from "socket.io-client";
import { getApiUrl, getBaseUrl } from "@/lib/api-config";
import { getMediaUrl } from "@/lib/media-url";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard-supplier" },
  { icon: Package, label: "Marché", href: "/dashboard-supplier/products" },
  { icon: Percent, label: "Promotions", href: "/dashboard-supplier/promotions" },
  { icon: Users, label: "Vente groupée", href: "/dashboard-supplier/sell-by-group" },
  { icon: FileText, label: "Ajouter Produit", href: "/dashboard-supplier/add-product" },
  { icon: ShoppingCart, label: "Réserves", href: "/dashboard-supplier/orders" },
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
  const [notifications, setNotifications] = useState<Array<NotificationData & { orderId?: string; buyerName?: string; productsCount?: number }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportFormData, setSupportFormData] = useState({
    email: "",
    phone: "",
    message: "",
  });
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadUserData = async () => {
      const session = await getSessionRole();
      if (!session) {
        router.push("/login");
        return;
      }

      try {
        const role = session.role;
        setUserRole(role);

        if (role !== "supplier") {
          router.push("/home");
          return;
        }

        setIsAuthenticated(true);

        try {
          const profileResult = await getProfile();
          if (profileResult.success && profileResult.data) {
            setUserData(profileResult.data);
          }
        } catch {
          // profile load failure is non-fatal
        }

        await loadProfileImage();
      } catch {
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

  // Save FCM token from React Native WebView (Android / iOS push)
  useEffect(() => {
    if (!isAuthenticated || userRole !== "supplier") return;
    return setupNativeFcmBridge({ enabled: true });
  }, [isAuthenticated, userRole]);

  // Fetch notifications from database on load (only unread for supplier)
  useEffect(() => {
    const loadNotifications = async () => {
      if (!isAuthenticated || userRole !== "supplier") return;

      try {
        const result = await getNotifications(true); // Get only unread notifications (isRead: false)
        if (result.success && result.data) {
          // Filter to show only unread notifications (isRead: false)
          const unreadNotifications = result.data.notifications.filter(n => !n.isRead);
          setNotifications(unreadNotifications);
          setUnreadCount(result.data.unreadCount);
        }
      } catch (error) {
        // Silent error handling
      }
    };

    loadNotifications();
  }, [isAuthenticated, userRole]);

  // Socket.io connection for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || userRole !== "supplier") return;

    const socket = socketIO(getBaseUrl(), {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      // Socket connected
    });

    socket.on("newOrder", async (data: {
      orderId: string;
      total: number;
      buyerName: string;
      productsCount: number;
      createdAt: string;
      notificationId?: string;
    }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ml:supplier-order", { detail: data }));
      }
      // Reload notifications from database to get the full notification object (only unread)
      try {
        const result = await getNotifications(true); // Get only unread notifications
        if (result.success && result.data) {
          // Filter to show only unread notifications (isRead: false)
          const unreadNotifications = result.data.notifications.filter(n => !n.isRead);
          setNotifications(unreadNotifications);
          setUnreadCount(result.data.unreadCount);
        }
      } catch (error) {
        // Silent error handling
      }
      
      // Show browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new window.Notification("Nouvelle réserve", {
          body: `Nouvelle réserve de ${data.buyerName} - ${data.total.toFixed(2)} DA`,
          icon: "/favicon.ico",
        });
      }
    });

    socket.on("orderStatusUpdate", async (data: {
      orderId: string;
      status: string;
      message: string;
      notificationId?: string;
    }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ml:supplier-order", { detail: data }));
      }
      try {
        const result = await getNotifications(true);
        if (result.success && result.data) {
          const unreadNotifications = result.data.notifications.filter((n) => !n.isRead);
          setNotifications(unreadNotifications);
          setUnreadCount(result.data.unreadCount);
        }
      } catch {
        // Silent
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new window.Notification("Mise à jour de réserve", {
          body: data.message,
          icon: "/favicon.ico",
        });
      }
    });

    socket.on("paymentUploaded", async (data: {
      orderId: string;
      total: number;
      buyerName: string;
      paymentId: string;
      notificationId?: string;
      createdAt: string;
    }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ml:supplier-payment", { detail: data }));
      }
      try {
        const result = await getNotifications(true);
        if (result.success && result.data) {
          const unreadNotifications = result.data.notifications.filter(n => !n.isRead);
          setNotifications(unreadNotifications);
          setUnreadCount(result.data.unreadCount);
        }
      } catch (error) {
        // Silent error handling
      }

      if ("Notification" in window && Notification.permission === "granted") {
        new window.Notification("Preuve de paiement reçue", {
          body: `${data.buyerName} a envoyé une preuve de paiement`,
          icon: "/favicon.ico",
        });
      }
    });

    socket.on("disconnect", () => {
      // Socket disconnected
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, userRole]);

  // Handle support form submission
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError(null);
    setSupportSuccess(false);
    setIsSubmittingSupport(true);

    try {
      const result = await createProblem({
        email: supportFormData.email.trim(),
        phone: supportFormData.phone.trim(),
        message: supportFormData.message.trim(),
      });

      if (result.success) {
        setSupportSuccess(true);
        // Reset form but keep email and phone from user data
        setSupportFormData({
          email: userData ? (userData.email || "") : "",
          phone: userData ? (userData.phone || "") : "",
          message: "",
        });
        setTimeout(() => {
          setShowSupportModal(false);
          setSupportSuccess(false);
        }, 2000);
      } else {
        setSupportError(result.message || "Erreur lors de l'envoi du message");
      }
    } catch (err) {
      // Silent error handling
      setSupportError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // Prevent body scroll when support modal is open
  useEffect(() => {
    if (showSupportModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showSupportModal]);

  const loadProfileImage = async () => {
    try {
      const API_BASE_URL = getApiUrl();
      const response = await apiFetch(`${API_BASE_URL}/supplier/profile-image`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.image) {
          let imagePath = result.data.image;
          
          // Handle different path formats
          // Remove leading slash if present
          if (imagePath.startsWith("/")) {
            imagePath = imagePath.slice(1);
          }
          
          // Build the full URL
          // If path already contains "uploads/profile/", use it as is
          // Otherwise assume it's just the filename in uploads/profile/
          if (!imagePath.includes("uploads/profile/") && !imagePath.includes("/")) {
            imagePath = `uploads/profile/${imagePath}`;
          }
          
          const fullImageUrl = getMediaUrl(imagePath);
          setProfileImage(fullImageUrl);
        } else {
          setProfileImage(null);
        }
      } else if (response.status === 404) {
        // No profile image exists yet
        setProfileImage(null);
      } else {
        setProfileImage(null);
      }
    } catch (err) {
      // Silent error handling
      setProfileImage(null);
    }
  };

  // Listen for profile updates (image and info)
  useEffect(() => {
    const handleProfileImageUpdate = () => {
      loadProfileImage();
    };

    const handleProfileUpdate = async () => {
      try {
        const profileResult = await getProfile();
        if (profileResult.success && profileResult.data) {
          setUserData(profileResult.data);
        }
        // Also reload profile image
        await loadProfileImage();
      } catch (error) {
        // Silent error handling
      }
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [router]);

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

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      // Silent error handling
    }
  };

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
            <Link href="/dashboard-supplier" className="flex items-center justify-center">
              <Image
                src="/pi/logo-dz-labomarket.png"
                alt="Market Lab Logo"
                width={150}
                height={60}
                className="w-32 h-16 object-contain"
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
            <button
              onClick={() => performLogout(router)}
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
        <header className="sticky top-0 z-[99] bg-white shadow-sm border-b border-gray-200">
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
                {menuItems.find((item) => item.href === pathname)?.label || "Tableau de bord"}
              </h1>
            </div>

            {/* User Info Section */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
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
                      className="fixed inset-0 z-[100]"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="fixed left-1/2 -translate-x-1/2 top-20 w-[calc(100vw-2rem)] sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-auto sm:mt-2 sm:w-72 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[101] animate-fade-in-up max-h-[70vh] sm:max-h-96 overflow-y-auto">
                      <div className="p-3 sm:p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                        <h3 className="font-bold text-base sm:text-lg">Notifications</h3>
                        <p className="text-xs sm:text-sm text-green-100">
                          {unreadCount > 0 
                            ? `${unreadCount} nouvelle${unreadCount > 1 ? "s" : ""} notification${unreadCount > 1 ? "s" : ""}`
                            : "Aucune nouvelle notification"}
                        </p>
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllNotificationsAsRead}
                              className="text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            >
                              Tout marquer lu
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {notifications.filter((notification) => !notification.isRead).length === 0 ? (
                          <div className="p-4 sm:p-6 text-center text-gray-500">
                            <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                            <p className="font-medium text-sm sm:text-base">Vous n'avez aucune nouvelle notification</p>
                            <p className="text-xs text-gray-400 mt-1">Toutes vos notifications ont été lues</p>
                          </div>
                        ) : (
                          notifications
                            .filter((notification) => !notification.isRead) // Only show unread notifications
                            .map((notification) => (
                            <div
                              key={notification._id}
                              className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                                !notification.isRead ? "bg-blue-50 border-l-4 border-blue-500" : ""
                              }`}
                              onClick={() => {
                                setShowNotifications(false);
                                // Optimistic UI + navigate immediately
                                if (!notification.isRead) {
                                  setNotifications((prev) =>
                                    prev.filter((n) => n._id !== notification._id)
                                  );
                                  setUnreadCount((prev) => Math.max(0, prev - 1));
                                  void markNotificationAsRead(notification._id).catch(() => {});
                                }
                                router.push("/dashboard-supplier/orders");
                              }}
                            >
                              <div className="flex items-start gap-2 sm:gap-3">
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  notification.type === "new_order" 
                                    ? "bg-gradient-to-br from-green-600 to-emerald-600"
                                    : notification.type === "order_status"
                                    ? "bg-gradient-to-br from-blue-600 to-cyan-600"
                                    : "bg-gradient-to-br from-gray-600 to-gray-700"
                                }`}>
                                  {notification.type === "new_order" ? (
                                    <ShoppingCart className="w-5 h-5 text-white" />
                                  ) : (
                                    <Bell className="w-5 h-5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-xs sm:text-sm text-gray-900 break-words">
                                    {notification.type === "new_order" ? "Nouvelle réserve" : "Mise à jour de réserve"}
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.createdAt).toLocaleString("fr-FR")}
                                  </p>
                                </div>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                                )}
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
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Silent error handling
                          setProfileImage(null);
                        }}
                      />
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
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fade-in-up">
                      {/* User Info Header */}
                      {userData && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            S
                            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                              {profileImage ? (
                                <img 
                                  src={profileImage} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Silent error handling
                                    setProfileImage(null);
                                    
                                  }}
                                />
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
                        <button
                          onClick={() => performLogout(router)}
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

        {/* Support Button - Fixed Bottom Right */}
        <button
          onClick={() => {
            // Pre-fill form with user data if available
            if (userData) {
              setSupportFormData({
                email: userData.email || "",
                phone: userData.phone || "",
                message: "",
              });
            } else {
              setSupportFormData({
                email: "",
                phone: "",
                message: "",
              });
            }
            setShowSupportModal(true);
          }}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-110"
          aria-label="Contacter le support"
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {/* Support Modal */}
        {showSupportModal && (
          <>
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] transition-opacity animate-fade-in"
              onClick={() => setShowSupportModal(false)}
            />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fade-in-up border border-gray-200 pointer-events-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Contactez le support</h3>
                    </div>
                    <button
                      onClick={() => setShowSupportModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSupportSubmit} className="p-6 space-y-4">
                  {supportError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {supportError}
                    </div>
                  )}

                  {supportSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Message envoyé avec succès !
                    </div>
                  )}

                  {/* Phone Field */}
                  <div>
                    <label htmlFor="support-phone-supplier" className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de téléphone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="support-phone-supplier"
                        type="tel"
                        required
                        readOnly={userData !== null}
                        disabled={userData !== null}
                        value={supportFormData.phone}
                        onChange={(e) => setSupportFormData({ ...supportFormData, phone: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                          userData ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="support-email-supplier" className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="support-email-supplier"
                        type="email"
                        required
                        readOnly={userData !== null}
                        disabled={userData !== null}
                        value={supportFormData.email}
                        onChange={(e) => setSupportFormData({ ...supportFormData, email: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                          userData ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>

                  {/* Message Field */}
                  <div>
                    <label htmlFor="support-message-supplier" className="block text-sm font-medium text-gray-700 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="support-message-supplier"
                      required
                      rows={5}
                      value={supportFormData.message}
                      onChange={(e) => setSupportFormData({ ...supportFormData, message: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Décrivez votre problème ou votre question..."
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingSupport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmittingSupport ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Envoyer</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

