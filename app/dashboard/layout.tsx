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
  ScrollText,
  FlaskConical,
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
  { icon: ScrollText, label: "Politiques", href: "/dashboard/policies" },
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
          new window.Notification(data.title || "Abonnement", {
            body: data.message || "Nouvelle activité d'abonnement.",
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

  const pageLabel =
    visibleMenuItems.find((item) => item.href === pathname)?.label || "Tableau de bord";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile / small-laptop drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — narrower on laptop so content stays readable at ~1366px */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] w-[min(17.5rem,88vw)] lg:w-56 xl:w-60 bg-white border-r border-slate-200/90 shadow-[4px_0_24px_rgba(15,23,42,0.04)] z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Menu d'administration"
      >
        <div className="flex flex-col h-full">
          <div className="relative px-4 py-3.5 xl:px-5 xl:py-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
            <Link href="/dashboard" className="flex flex-col items-center gap-1.5">
              <Image
                src="/images/logo.png"
                alt="Dz Labmarket Logo"
                width={140}
                height={56}
                className="w-24 h-12 xl:w-28 xl:h-14 object-contain"
                priority
              />
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-800">
                <FlaskConical className="h-3 w-3" />
                Admin labo
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

          <nav className="dashboard-scroll flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 xl:px-3">
            <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Navigation
            </p>
            <ul className="space-y-0.5">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const showBadge = item.href === "/dashboard/subscriptions" && pendingUsersCount > 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2 xl:px-3 xl:py-2.5 rounded-xl transition-all duration-200 group relative text-sm ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                          : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon
                        className={`w-[1.15rem] h-[1.15rem] shrink-0 transition-transform ${
                          isActive ? "" : "group-hover:scale-105"
                        }`}
                      />
                      <span className="font-medium truncate leading-tight">{item.label}</span>
                      {showBadge && (
                        <span
                          className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${
                            isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white"
                          }`}
                        >
                          {pendingUsersCount > 99 ? "99+" : pendingUsersCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-2.5 xl:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 space-y-2">
            {profile && (
              <div className="hidden lg:flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                {profile.profileImage ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-600/40 shrink-0">
                    <Image
                      key={imageKey}
                      src={getImageUrl(profile.profileImage) || ""}
                      alt=""
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {profile.firstName} {profile.lastName}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">
                    {isSouAdminRole(userRole) ? "Sou-admin" : "Administrateur"}
                  </p>
                </div>
              </div>
            )}
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
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
          <div className="flex items-center gap-2 px-3 sm:px-4 xl:px-6 h-14 max-w-[1600px]">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden -ml-0.5 p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
              aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-slate-700" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700" />
              )}
            </button>
            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
              <div className="min-w-0">
                <p className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Console laboratoire
                </p>
                <h1 className="min-w-0 truncate text-[15px] sm:text-lg font-bold text-slate-900 leading-tight">
                  {pageLabel}
                </h1>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
                {/* App notifications (new users, etc.) — same as supplier bell */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotificationsDropdown(!showNotificationsDropdown);
                      setShowProblemsDropdown(false);
                      setShowProfileMenu(false);
                    }}
                    className="relative p-2 rounded-xl hover:bg-blue-50 transition-colors group"
                    aria-label="Notifications"
                  >
                    <Users className="w-5 h-5 text-slate-600 group-hover:text-blue-700 transition-colors" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
                      <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[75dvh] sm:max-h-96 overflow-hidden flex flex-col animate-fade-in">
                        <div className="p-3.5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                              <Bell className="w-4 h-4 text-blue-700" />
                              Notifications
                            </h3>
                            {!isSouAdminRole(userRole) && (
                              <Link
                                href="/dashboard/subscriptions"
                                onClick={() => setShowNotificationsDropdown(false)}
                                className="text-xs sm:text-sm text-blue-700 hover:text-blue-800 font-semibold"
                              >
                                Abonnements
                              </Link>
                            )}
                          </div>
                          {unreadNotificationsCount > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              {unreadNotificationsCount} non lu
                              {unreadNotificationsCount > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className="dashboard-scroll overflow-y-auto flex-1">
                          {adminNotifications.length === 0 ? (
                            <div className="p-6 text-center">
                              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-500 text-sm">Aucune nouvelle notification</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {adminNotifications.slice(0, 8).map((notification) => (
                                <button
                                  key={notification._id}
                                  type="button"
                                  className="w-full text-left block p-3.5 hover:bg-blue-50/50 transition-colors"
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
                                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                      <Users className="w-4 h-4 text-blue-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-900">
                                        Nouvel utilisateur
                                      </p>
                                      <p className="text-xs text-slate-600 line-clamp-3">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">
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
                    className="relative p-2 rounded-xl hover:bg-blue-50 transition-colors group"
                    aria-label="Problèmes signalés"
                  >
                    <Bell className="w-5 h-5 text-slate-600 group-hover:text-blue-700 transition-colors" />
                    {unreadProblemsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadProblemsCount > 9 ? "9+" : unreadProblemsCount}
                      </span>
                    )}
                  </button>
                  {showProblemsDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                        onClick={() => setShowProblemsDropdown(false)}
                      />
                      <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[75dvh] sm:max-h-96 overflow-hidden flex flex-col animate-fade-in">
                        <div className="p-3.5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-blue-700" />
                              Problèmes
                            </h3>
                            <Link
                              href="/dashboard/problems"
                              onClick={() => setShowProblemsDropdown(false)}
                              className="text-xs sm:text-sm text-blue-700 hover:text-blue-800 font-semibold"
                            >
                              Voir tout
                            </Link>
                          </div>
                          {unreadProblemsCount > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              {unreadProblemsCount} non lu{unreadProblemsCount > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className="dashboard-scroll overflow-y-auto flex-1">
                          {problems.filter((p) => !p.is_read).length === 0 ? (
                            <div className="p-6 text-center">
                              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-500 text-sm">Aucun nouveau problème</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {problems
                                .filter((p) => !p.is_read)
                                .slice(0, 5)
                                .map((problem) => (
                                  <Link
                                    key={problem._id}
                                    href="/dashboard/problems"
                                    onClick={async () => {
                                      setShowProblemsDropdown(false);
                                      try {
                                        await markProblemAsRead(problem._id);
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
                                    className="block p-3.5 hover:bg-blue-50/50 transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                        <MessageCircle className="w-4 h-4 text-blue-700" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                          {problem.email}
                                        </p>
                                        <p className="text-xs text-slate-600 truncate">
                                          {problem.message}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
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
                    className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-full sm:rounded-xl hover:bg-slate-100 transition-colors"
                    aria-label="Menu du profil"
                    aria-expanded={showProfileMenu}
                  >
                    {profile.profileImage ? (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-blue-600/70">
                        <Image
                          key={imageKey}
                          src={getImageUrl(profile.profileImage) || ""}
                          alt={`${profile.firstName} ${profile.lastName}`}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200">
                        <User className="w-4 h-4 text-blue-700" />
                      </div>
                    )}
                    <span className="hidden xl:block max-w-[9rem] truncate text-sm font-medium text-slate-700">
                      {profile.firstName} {profile.lastName}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 hidden sm:block transition-transform ${
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
                  <div
                    className={`absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 transition-all duration-200 z-50 ${
                      showProfileMenu ? "opacity-100 visible" : "opacity-0 invisible"
                    }`}
                  >
                    <div className="py-1.5">
                      <div className="px-3.5 pb-2 mb-1 border-b border-slate-100 xl:hidden">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {profile.firstName} {profile.lastName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {isSouAdminRole(userRole) ? "Sou-admin" : "Administrateur labo"}
                        </p>
                      </div>
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3.5 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Mon Profil</span>
                      </Link>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={() => performLogout(router)}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
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

        {/* Denser padding on small laptops; cap width for readability */}
        <main className="p-3 sm:p-4 xl:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-[1600px] animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

