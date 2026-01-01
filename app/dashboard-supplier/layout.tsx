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
  Store,
} from "lucide-react";
import { getAuthToken } from "@/lib/api";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard-supplier" },
  { icon: Package, label: "Mes Produits", href: "/dashboard-supplier/products" },
  { icon: ShoppingCart, label: "Commandes", href: "/dashboard-supplier/orders" },
  { icon: BarChart3, label: "Statistiques", href: "/dashboard-supplier/statistics" },
  { icon: Store, label: "Mon Magasin", href: "/dashboard-supplier/store" },
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
      setUserRole(role);

      // Check if user is supplier
      if (role !== "supplier") {
        router.push("/home");
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error decoding token:", error);
      router.push("/login");
    }
  }, [router]);

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
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">
                {menuItems.find((item) => item.href === pathname)?.label || "Dashboard Fournisseur"}
              </h1>
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

