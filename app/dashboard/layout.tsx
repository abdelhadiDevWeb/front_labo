"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Shield,
  User,
  ShoppingCart,
  CreditCard,
  Menu,
  X,
  LogOut,
  ChevronDown,
  MessageCircle,
  Bell,
  FolderTree,
  Megaphone,
} from "lucide-react";
import { getSessionRole, getAdminProfile, AdminProfile, getAllProblems, Problem, markProblemAsRead, getUsersForSubscription, getNotifications, markNotificationAsRead, NotificationData } from "@/lib/api";
import { performLogout } from "@/lib/perform-logout";
import { setupNativeFcmBridge } from "@/lib/fcm-bridge";
import { isPathAllowedForSouAdmin, isSouAdminRole, SOU_ADMIN_MENU_HREFS } from "@/lib/admin-access";
import { io as socketIO } from "socket.io-client";
import { getBaseUrl } from "@/lib/api-config";
import { getMediaUrl } from "@/lib/media-url";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard" },
  { icon: ShoppingCart, label: "Commandes", href: "/dashboard/orders" },
  { icon: Users, label: "Utilisateurs", href: "/dashboard/users" },
  { icon: FolderTree, label: "Catégories", href: "/dashboard/categories" },
  { icon: CreditCard, label: "Gestion Abonnements", href: "/dashboard/subscriptions" },
  { icon: Megaphone, label: "Sponsorisations", href: "/dashboard/sponsors" },
  { icon: BarChart3, label: "Statistiques", href: "/dashboard/statistics" },
  { icon: Shield, label: "Administrateurs", href: "/dashboard/admins" },
  { icon: MessageCircle, label: "Problèmes", href: "/dashboard/problems" },
  { icon: User, label: "Profil", href: "/dashboard/profile" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [imageKey, setImageKey] = useState(0); // Key to force image refresh
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showProblemsDropdown, setShowProblemsDropdown] = useState(false);
  const [unreadProblemsCount, setUnreadProblemsCount] = useState(0);
  const [adminNotifications, setAdminNotifications] = useState<NotificationData[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setSidebarOpen(false);
    setShowNotificationsDropdown(false);
    setShowProblemsDropdown(false);
    setShowProfileMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const verify = async () => {
      const session = await getSessionRole();
      if (!session) {
        router.push("/login");
        return;
      }

      if (session.role !== "admin" && session.role !== "sou-admin") {
        router.push("/home");
        return;
      }

      setIsAuthenticated(true);
      setUserRole(session.role);
      loadProfile();
    };

    verify();
  }, [router]);

  useEffect(() => {
    if (!userRole) return;

    if (isSouAdminRole(userRole) && !isPathAllowedForSouAdmin(pathname)) {
      router.replace("/dashboard");
    }
  }, [userRole, pathname, router]);

  const visibleMenuItems = menuItems.filter((item) => {
    if (userRole === "admin") return true;
    if (isSouAdminRole(userRole)) {
      return (SOU_ADMIN_MENU_HREFS as readonly string[]).includes(item.href);
    }
    return item.href !== "/dashboard/admins";
  });

  // Listen for profile updates (image and info)
  useEffect(() => {
    const handleProfileImageUpdate = () => {
      loadProfile();
    };

    const handleProfileUpdate = () => {
      // Reload profile to get updated information
      loadProfile();
    };

    window.addEventListener("profileImageUpdated", handleProfileImageUpdate);
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileImageUpdated", handleProfileImageUpdate);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [router]);

  const loadProfile = async () => {
    try {
      const result = await getAdminProfile();
      if (result.success && result.data) {
        setProfile(result.data);
        // Update image key to force refresh
        setImageKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Load profile error:", err);
    }
  };

  const loadPendingUsersCount = useCallback(async () => {
    try {
      const result = await getUsersForSubscription();
      if (result.success && result.data) {
        const count = result.data.users?.length || 0;
        setPendingUsersCount(count);
        window.dispatchEvent(new CustomEvent("pendingUsersUpdated", { detail: { count } }));
      }
    } catch (error) {
      console.error("Error loading pending users count:", error);
    }
  }, []);

  const loadAdminNotifications = useCallback(async () => {
    try {
      const result = await getNotifications(true);
      if (result.success && result.data) {
        const unread = (result.data.notifications || []).filter((n) => !n.isRead);
        setAdminNotifications(unread);
        setUnreadNotificationsCount(result.data.unreadCount ?? unread.length);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load problems on mount (full admin only — sou-admin has no problems access)
  useEffect(() => {
    if (!isAuthenticated || isSouAdminRole(userRole)) return;

    const loadProblems = async () => {
      try {
        const result = await getAllProblems();
        if (result.success && result.data) {
          setProblems(result.data);
          const unreadCount = result.data.filter((p) => !p.is_read).length;
          setUnreadProblemsCount(unreadCount);
        }
      } catch (error) {
        console.error("Error loading problems:", error);
      }
    };

    loadProblems();
  }, [isAuthenticated, userRole]);

  // In-app notifications (new users, etc.) — web dashboard + mobile WebView
  useEffect(() => {
    if (!isAuthenticated) return;
    void loadAdminNotifications();
  }, [isAuthenticated, loadAdminNotifications]);

  // Register FCM token for admin push (mobile WebView)
  useEffect(() => {
    if (!isAuthenticated || (userRole !== "admin" && userRole !== "sou-admin")) {
      return;
    }
    return setupNativeFcmBridge({ enabled: true });
  }, [isAuthenticated, userRole]);

  // Load pending users count (full admin only)
  useEffect(() => {
    if (!isAuthenticated || isSouAdminRole(userRole)) return;

    loadPendingUsersCount();
    
    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      loadPendingUsersCount();
    };

    const handlePendingUsersUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === "number") {
        setPendingUsersCount(customEvent.detail.count);
        return;
      }
      loadPendingUsersCount();
    };

    window.addEventListener("subscriptionUpdated", handleSubscriptionUpdate);
    window.addEventListener("pendingUsersUpdated", handlePendingUsersUpdated);

    return () => {
      window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdate);
      window.removeEventListener("pendingUsersUpdated", handlePendingUsersUpdated);
    };
  }, [isAuthenticated, userRole, loadPendingUsersCount]);

  // Socket.io + polling fallback — realtime admin notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const refreshAll = async () => {
      await loadAdminNotifications();
      if (!isSouAdminRole(userRole)) {
        await loadPendingUsersCount();
      }
    };

    // Polling fallback: Hostinger / Next rewrites often drop WebSocket upgrades,
    // so sockets can fail silently while HTTP API still works.
    const pollId = window.setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") {
        void refreshAll();
      }
    }, 12_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshAll();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Prefer polling first — more reliable through reverse proxies than websocket-first
    const socket = socketIO(getBaseUrl(), {
      withCredentials: true,
      path: "/socket.io",
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      // Connected to admin room (server-assigned)
      void refreshAll();
    });

    socket.on("connect_error", () => {
      // Keep polling; do not leave the UI stuck without updates
    });

    socket.on("newProblem", async (data: { email?: string }) => {
      if (isSouAdminRole(userRole)) return;
      try {
        const result = await getAllProblems();
        if (result.success && result.data) {
          setProblems(result.data);
          setUnreadProblemsCount(result.data.filter((p) => !p.is_read).length);
        }
      } catch {
        // ignore
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new window.Notification("Nouveau message de support", {
          body: `Nouveau message de ${data.email || "un utilisateur"}`,
          icon: "/favicon.ico",
        });
      }
    });

    // Badge + notification list (older clients may only emit this event)
    socket.on("pendingUserActivity", async () => {
      await refreshAll();
    });

    socket.on(
      "newAdminNotification",
      async (data: { title?: string; message?: string }) => {
        // Optimistic badge bump, then reload from DB (same pattern as supplier newOrder)
        setUnreadNotificationsCount((c) => c + 1);
        await refreshAll();

        if ("Notification" in window && Notification.permission === "granted") {
          new window.Notification(data.title || "Nouvel utilisateur", {
            body: data.message || "Un nouvel utilisateur attend une activation.",
            icon: "/favicon.ico",
          });
        }
      }
    );

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isAuthenticated, userRole, loadPendingUsersCount, loadAdminNotifications]);

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const mediaUrl = getMediaUrl(imagePath);
    if (!mediaUrl) return null;
    // Add cache-busting parameter using imageKey to ensure fresh image loads
    return `${mediaUrl}${mediaUrl.includes("?") ? "&" : "?"}v=${imageKey}`;
  };

  if (!isAuthenticated) {
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
        className={`fixed top-0 left-0 h-[100dvh] w-72 max-w-[85vw] lg:w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Menu d'administration"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="relative px-6 py-4 lg:py-6 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center justify-center">
              <Image
                src="/images/logo.jpeg"
                alt="Dz Labmarket Logo"
                width={150}
                height={60}
                className="w-28 h-14 lg:w-32 lg:h-16 object-contain"
              />
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const showBadge = item.href === "/dashboard/subscriptions" && pendingUsersCount > 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50"
                          : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                      <span className="font-medium">{item.label}</span>
                      {showBadge && (
                        <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-red-500 text-white"
                        }`}>
                          {pendingUsersCount > 99 ? "99+" : pendingUsersCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 space-y-2">
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
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center gap-2 px-3 sm:px-6 lg:px-8 h-14 sm:h-16">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden -ml-1 p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
              <h1 className="min-w-0 truncate text-base sm:text-xl font-bold text-gray-900">
                {visibleMenuItems.find((item) => item.href === pathname)?.label || "Tableau de bord"}
              </h1>
              <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                {/* App notifications (new users, etc.) — same as supplier bell */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotificationsDropdown(!showNotificationsDropdown);
                      setShowProblemsDropdown(false);
                      setShowProfileMenu(false);
                    }}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                    aria-label="Notifications"
                  >
                    <Users className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                      </span>
                    )}
                  </button>
                  {showNotificationsDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                        onClick={() => setShowNotificationsDropdown(false)}
                      />
                      <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[75dvh] sm:max-h-96 overflow-hidden flex flex-col animate-fade-in">
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <Bell className="w-5 h-5 text-indigo-600" />
                              Notifications
                            </h3>
                            {!isSouAdminRole(userRole) && (
                              <Link
                                href="/dashboard/subscriptions"
                                onClick={() => setShowNotificationsDropdown(false)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Abonnements
                              </Link>
                            )}
                          </div>
                          {unreadNotificationsCount > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                              {unreadNotificationsCount} non lu
                              {unreadNotificationsCount > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className="overflow-y-auto flex-1">
                          {adminNotifications.length === 0 ? (
                            <div className="p-6 text-center">
                              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">Aucune nouvelle notification</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {adminNotifications.slice(0, 8).map((notification) => (
                                <button
                                  key={notification._id}
                                  type="button"
                                  className="w-full text-left block p-4 hover:bg-gray-50 transition-colors"
                                  onClick={async () => {
                                    try {
                                      await markNotificationAsRead(notification._id);
                                      await loadAdminNotifications();
                                    } catch {
                                      // ignore
                                    }
                                    setShowNotificationsDropdown(false);
                                    if (!isSouAdminRole(userRole)) {
                                      router.push("/dashboard/subscriptions");
                                    }
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                                      <Users className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900">
                                        Nouvel utilisateur
                                      </p>
                                      <p className="text-xs text-gray-600 line-clamp-3">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {new Date(notification.createdAt).toLocaleDateString("fr-FR", {
                                          day: "2-digit",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Problems Notifications — full admin only */}
                {!isSouAdminRole(userRole) && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProblemsDropdown(!showProblemsDropdown);
                      setShowNotificationsDropdown(false);
                      setShowProfileMenu(false);
                    }}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                    aria-label="Problèmes signalés"
                  >
                    <Bell className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    {unreadProblemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadProblemsCount > 9 ? "9+" : unreadProblemsCount}
                      </span>
                    )}
                  </button>
                  {/* Problems Dropdown */}
                  {showProblemsDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                        onClick={() => setShowProblemsDropdown(false)}
                      />
                      <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[75dvh] sm:max-h-96 overflow-hidden flex flex-col animate-fade-in">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <MessageCircle className="w-5 h-5 text-blue-600" />
                              Problèmes
                            </h3>
                            <Link
                              href="/dashboard/problems"
                              onClick={() => setShowProblemsDropdown(false)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Voir tout
                            </Link>
                          </div>
                          {unreadProblemsCount > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                              {unreadProblemsCount} non lu{unreadProblemsCount > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        {/* Problems List */}
                        <div className="overflow-y-auto flex-1">
                          {problems.filter((p) => !p.is_read).length === 0 ? (
                            <div className="p-6 text-center">
                              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">Aucun nouveau problème</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {problems
                                .filter((p) => !p.is_read)
                                .slice(0, 5)
                                .map((problem) => (
                                  <Link
                                    key={problem._id}
                                    href="/dashboard/problems"
                                    onClick={async () => {
                                      setShowProblemsDropdown(false);
                                      // Mark as read when clicked
                                      try {
                                        await markProblemAsRead(problem._id);
                                        // Reload problems
                                        const result = await getAllProblems();
                                        if (result.success && result.data) {
                                          setProblems(result.data);
                                          const unreadCount = result.data.filter((p) => !p.is_read).length;
                                          setUnreadProblemsCount(unreadCount);
                                        }
                                      } catch (error) {
                                        console.error("Error marking problem as read:", error);
                                      }
                                    }}
                                    className="block p-4 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                        <MessageCircle className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                          {problem.email}
                                        </p>
                                        <p className="text-xs text-gray-600 truncate">
                                          {problem.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {new Date(problem.createdAt).toLocaleDateString("fr-FR", {
                                            day: "2-digit",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                )}
                {profile && (
                  <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(!showProfileMenu);
                      setShowNotificationsDropdown(false);
                      setShowProblemsDropdown(false);
                    }}
                    className="flex items-center gap-2 p-1 rounded-full sm:rounded-lg hover:opacity-80 transition-opacity"
                    aria-label="Menu du profil"
                    aria-expanded={showProfileMenu}
                  >
                    {profile.profileImage ? (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-blue-600">
                        <Image
                          key={imageKey}
                          src={getImageUrl(profile.profileImage) || ""}
                          alt={`${profile.firstName} ${profile.lastName}`}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <span className="hidden md:block max-w-[10rem] truncate text-sm font-medium text-gray-700">
                      {profile.firstName} {profile.lastName}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 hidden sm:block transition-transform ${
                        showProfileMenu ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showProfileMenu && (
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileMenu(false)}
                    />
                  )}
                  {/* Dropdown Menu */}
                  <div
                    className={`absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-200 z-50 ${
                      showProfileMenu ? "opacity-100 visible" : "opacity-0 invisible"
                    }`}
                  >
                    <div className="py-2">
                      <div className="px-4 pb-2 mb-1 border-b border-gray-100 md:hidden">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {profile.firstName} {profile.lastName}
                        </p>
                      </div>
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Mon Profil</span>
                      </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => performLogout(router)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

