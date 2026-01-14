"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { getAuthToken, getAdminProfile, AdminProfile, getAllProblems, Problem, markProblemAsRead } from "@/lib/api";
import { io as socketIO } from "socket.io-client";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard" },
  { icon: ShoppingCart, label: "Commandes", href: "/dashboard/orders" },
  { icon: Users, label: "Gestion Users", href: "/dashboard/users" },
  { icon: CreditCard, label: "Gestion Abonnements", href: "/dashboard/subscriptions" },
  { icon: BarChart3, label: "Statistiques", href: "/dashboard/statistics" },
  { icon: Shield, label: "Gestion Admin", href: "/dashboard/admins" },
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
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login");
      return;
    }

    // Decode token to get role
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = payload.role;

      // Check if user is admin
      if (role !== "admin") {
        router.push("/home");
        return;
      }

      setIsAuthenticated(true);
      loadProfile();
    } catch (error) {
      console.error("Error decoding token:", error);
      router.push("/login");
    }
  }, [router]);

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

  // Load problems on mount and when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated]);

  // Socket.io connection for real-time problem notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = getAuthToken();
    if (!token) return;

    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000", {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.io server (admin)");
    });

    socket.on("newProblem", async (data: {
      problemId: string;
      email: string;
      phone: string;
      message: string;
      createdAt: string;
    }) => {
      // Reload problems from database
      try {
        const result = await getAllProblems();
        if (result.success && result.data) {
          setProblems(result.data);
          const unreadCount = result.data.filter((p) => !p.is_read).length;
          setUnreadProblemsCount(unreadCount);
        }
      } catch (error) {
        console.error("Error reloading problems:", error);
      }

      // Show browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new window.Notification("Nouveau message de support", {
          body: `Nouveau message de ${data.email}`,
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
  }, [isAuthenticated]);

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";
    // Add cache-busting parameter using imageKey to ensure fresh image loads
    return `${baseUrl}/${imagePath}?v=${imageKey}`;
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
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center justify-center">
              <Image
                src="/pi/ima.jpeg"
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
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50"
                          : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
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
            <div className="flex items-center justify-between w-full">
              <h1 className="text-xl font-bold text-gray-900">
                {menuItems.find((item) => item.href === pathname)?.label || "Dashboard"}
              </h1>
              <div className="flex items-center gap-4">
                {/* Problems Notifications */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProblemsDropdown(!showProblemsDropdown);
                    }}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group"
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
                        className="fixed inset-0 z-40"
                        onClick={() => setShowProblemsDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
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
                {profile && (
                  <div className="relative group">
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {profile.profileImage ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-600">
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
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {profile.firstName} {profile.lastName}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                  </button>
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Mon Profil</span>
                      </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => {
                          localStorage.removeItem("authToken");
                          router.push("/login");
                        }}
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
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

