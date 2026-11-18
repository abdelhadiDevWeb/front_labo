"use client";

import { useState, useEffect, useRef } from "react";
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
  Megaphone,
} from "lucide-react";
import { getSessionRole, getProfile, ClientData, NotificationData, createProblem, apiFetch } from "@/lib/api";
import { performLogout } from "@/lib/perform-logout";
import { setupNativeFcmBridge } from "@/lib/fcm-bridge";
import { getApiUrl } from "@/lib/api-config";
import { useNotificationFeed } from "@/hooks/useNotificationFeed";
import NotificationPanel, { RealtimeToast, type NotificationVisual } from "@/components/NotificationPanel";
import { showBrowserNotification } from "@/lib/browser-notification";
import { getMediaUrl } from "@/lib/media-url";
import BackButton from "@/components/BackButton";
import ListingQuotaHeaderAlert, {
  SUBSCRIPTION_REQUEST_UPDATED_EVENT,
} from "@/components/supplier/ListingQuotaHeaderAlert";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard-supplier" },
  { icon: Package, label: "Marché", href: "/dashboard-supplier/products" },
  { icon: Megaphone, label: "Publicité", href: "/dashboard-supplier/publicite" },
  { icon: Percent, label: "Promotions", href: "/dashboard-supplier/promotions" },
  { icon: Users, label: "Vente groupée", href: "/dashboard-supplier/sell-by-group" },
  { icon: FileText, label: "Ajouter Produit", href: "/dashboard-supplier/add-product" },
  { icon: ShoppingCart, label: "Réserves", href: "/dashboard-supplier/orders" },
  { icon: MessageCircle, label: "Messages", href: "/dashboard-supplier/messages" },
  { icon: BarChart3, label: "Statistiques", href: "/dashboard-supplier/statistics" },
  { icon: User, label: "Profil", href: "/dashboard-supplier/profile" },
];

const DETAIL_SECTIONS: Record<string, string> = {
  products: "Détail du produit",
  machines: "Détail de la machine",
  services: "Détail du service",
};

/** Header title: menu label, or the detail label for /dashboard-supplier/{products|machines|services}/[id]. */
const supplierPageTitle = (pathname: string) => {
  const exact = menuItems.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const [, , section, id] = pathname.split("/");
  if (section && id && DETAIL_SECTIONS[section]) return DETAIL_SECTIONS[section];
  const parent = menuItems
    .filter((item) => item.href !== "/dashboard-supplier" && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return parent?.label || "Tableau de bord";
};

/** Where "Retour" goes when there is no previous in-app page (direct open / refresh). */
const supplierBackFallback = (pathname: string) => {
  const [, , section, id] = pathname.split("/");
  if (section && id && DETAIL_SECTIONS[section]) return "/dashboard-supplier/products";
  return "/dashboard-supplier";
};

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
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
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

  const notify = (title: string, message: string, href?: string) => {
    showBrowserNotification(title, message);
    return { title, message, href };
  };

  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    toast,
    dismissToast,
  } = useNotificationFeed(isAuthenticated && userRole === "supplier", {
    newOrder: {
      handle: (payload) => {
        const data = payload as { buyerName?: string; total?: number };
        window.dispatchEvent(new CustomEvent("ml:supplier-order", { detail: payload }));
        const total = Number(data.total);
        return notify(
          "Nouvelle réserve",
          `Nouvelle réserve de ${data.buyerName || "un laboratoire"}${
            Number.isFinite(total) ? ` - ${total.toFixed(2)} DA` : ""
          }`,
          "/dashboard-supplier/orders"
        );
      },
    },
    orderStatusUpdate: {
      handle: (payload) => {
        const data = payload as { message?: string };
        window.dispatchEvent(new CustomEvent("ml:supplier-order", { detail: payload }));
        return notify("Mise à jour de réserve", data.message || "", "/dashboard-supplier/orders");
      },
    },
    lowStockAlert: {
      handle: (payload) => {
        const data = payload as { message?: string };
        return notify("Alerte stock bas", data.message || "", "/dashboard-supplier/products");
      },
    },
    paymentUploaded: {
      handle: (payload) => {
        const data = payload as { buyerName?: string };
        window.dispatchEvent(new CustomEvent("ml:supplier-payment", { detail: payload }));
        return notify(
          "Preuve de paiement reçue",
          `${data.buyerName || "Un laboratoire"} a envoyé une preuve de paiement`,
          "/dashboard-supplier/orders"
        );
      },
    },
    subscriptionRequestUpdate: {
      handle: (payload) => {
        const data = payload as { title?: string; message?: string };
        window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUEST_UPDATED_EVENT, { detail: payload }));
        return notify(data.title || "Abonnement", data.message || "", "/dashboard-supplier");
      },
    },
    newChatNotification: {
      handle: (payload) => {
        const data = payload as {
          title?: string;
          message?: string;
          conversationId?: string;
        };
        const href = data.conversationId
          ? `/dashboard-supplier/messages?c=${data.conversationId}`
          : "/dashboard-supplier/messages";
        showBrowserNotification(data.title || "Nouveau message", data.message || "");
        return notify(data.title || "Nouveau message", data.message || "", href);
      },
    },
    "chat:newConversation": {
      handle: (payload) => {
        const data = payload as {
          conversationId?: string;
          message?: string;
          clientName?: string;
        };
        const href = data.conversationId
          ? `/dashboard-supplier/messages?c=${data.conversationId}`
          : "/dashboard-supplier/messages";
        const message =
          data.message ||
          `${data.clientName || "Un laboratoire"} a ouvert une conversation avec vous.`;
        showBrowserNotification("Nouveau chat", message);
        return notify("Nouveau chat", message, href);
      },
    },
  });

  const notificationHref = (notification: NotificationData) => {
    if (notification.type === "chat") {
      return notification.refId
        ? `/dashboard-supplier/messages?c=${notification.refId}`
        : "/dashboard-supplier/messages";
    }
    if (notification.type === "subscription") return "/dashboard-supplier";
    if (notification.type === "system") return "/dashboard-supplier/products";
    return "/dashboard-supplier/orders";
  };

  const describeNotification = (notification: NotificationData): NotificationVisual => {
    switch (notification.type) {
      case "new_order":
        return {
          title: "Nouvelle réserve",
          icon: <ShoppingCart className="w-5 h-5" />,
          iconClassName: "bg-gradient-to-br from-green-700 to-emerald-800",
        };
      case "order_status":
        return {
          title: "Mise à jour de réserve",
          icon: <Bell className="w-5 h-5" />,
          iconClassName: "bg-gradient-to-br from-green-700 to-emerald-800",
        };
      case "subscription":
        return {
          title: "Abonnement",
          icon: <CreditCard className="w-5 h-5" />,
          iconClassName: "bg-gradient-to-br from-purple-600 to-indigo-600",
        };
      case "system":
        return {
          title: "Alerte stock bas",
          icon: <Package className="w-5 h-5" />,
          iconClassName: "bg-gradient-to-br from-amber-500 to-orange-600",
        };
      case "chat":
        return {
          title: "Message",
          icon: <MessageCircle className="w-5 h-5" />,
          iconClassName: "bg-gradient-to-br from-green-700 to-emerald-800",
        };
      default:
        return {
          title: "Mise à jour de réserve",
          icon: <Bell className="w-5 h-5" />,
          iconClassName: "bg-gradient-to-br from-gray-600 to-gray-700",
        };
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 supplier-lab-shell">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] w-[min(17.5rem,88vw)] lg:w-56 xl:w-60 bg-white border-r border-slate-200/90 shadow-[4px_0_24px_rgba(15,23,42,0.04)] z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Menu fournisseur"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="relative px-4 py-3.5 xl:px-5 xl:py-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-green-50/40">
            <Link href="/dashboard-supplier" className="flex flex-col items-center gap-1.5">
              <Image
                src="/images/logo.png"
                alt="Dz Labmarket Logo"
                width={140}
                height={56}
                className="w-24 h-12 xl:w-28 xl:h-14 object-contain"
                priority
              />
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200/80 bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-green-800">
                Espace fournisseur
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute right-2.5 top-2.5 p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="dashboard-scroll flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 xl:px-3">
            <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Navigation
            </p>
            <ul className="space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard-supplier"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2 xl:px-3 xl:py-2.5 rounded-xl transition-all duration-200 group relative text-sm ${
                        isActive
                          ? "bg-gradient-to-r from-green-700 to-emerald-800 text-white shadow-md shadow-green-800/30"
                          : "text-slate-700 hover:bg-green-50 hover:text-green-800"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon
                        className={`w-[1.15rem] h-[1.15rem] shrink-0 transition-transform ${
                          isActive ? "" : "group-hover:scale-105"
                        }`}
                      />
                      <span className="font-medium truncate leading-tight">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Actions */}
          <div className="p-2.5 xl:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 space-y-2">
            <button
              onClick={() => performLogout(router)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 xl:px-3 xl:py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-56 xl:pl-60 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-[99] border-b border-slate-200/90 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 xl:px-6 h-14 max-w-[1600px]">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-slate-700" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-700" />
                )}
              </button>
              {pathname !== "/dashboard-supplier" && (
                <BackButton
                  fallbackHref={supplierBackFallback(pathname)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2 sm:px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  iconClassName="w-5 h-5"
                  label={<span className="hidden sm:inline">Retour</span>}
                />
              )}
              <div className="min-w-0">
                <p className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.14em] text-green-700">
                  Console fournisseur
                </p>
                <h1 className="text-[15px] sm:text-lg font-bold text-slate-900 truncate leading-tight">
                  {supplierPageTitle(pathname)}
                </h1>
              </div>
            </div>

            {/* User Info Section */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  ref={bellRef}
                  type="button"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                  }}
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                  className="relative p-2 rounded-xl hover:bg-green-50 transition-colors group"
                >
                  <Bell className="w-5 h-5 text-slate-600 group-hover:text-green-700 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[1.125rem] h-[1.125rem] px-1 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <NotificationPanel
                  open={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  anchorRef={bellRef}
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onMarkAllRead={() => void markAllRead().catch(() => {})}
                  onItemClick={(notification) => {
                                setShowNotifications(false);
                    markRead(notification._id);
                    router.push(notificationHref(notification));
                  }}
                  describe={describeNotification}
                  theme="green"
                />
                <RealtimeToast
                  toast={toast}
                  onDismiss={dismissToast}
                  onOpen={(t) => {
                    if (t.href) router.push(t.href);
                  }}
                  theme="green"
                />
              </div>

              {/* User Profile Dropdown */}
              <div className="relative user-dropdown-container">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-green-700 to-emerald-800 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow overflow-hidden">
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
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-emerald-800 rounded-full flex items-center justify-center shadow-md overflow-hidden">
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
                          href="/dashboard-supplier/messages"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <MessageCircle className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium">Messages</span>
                        </Link>
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
          <ListingQuotaHeaderAlert />
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 xl:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-[1600px] animate-fade-in">{children}</div>
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
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-green-700 to-emerald-800 text-white p-4 rounded-full shadow-2xl hover:shadow-green-700/50 transition-all duration-300 transform hover:scale-110"
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
                      <div className="p-2 bg-gradient-to-r from-green-700 to-emerald-800 rounded-xl">
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
                        className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
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
                        className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Décrivez votre problème ou votre question..."
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingSupport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-700 to-emerald-800 text-white rounded-xl font-semibold hover:from-green-800 hover:to-emerald-900 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

