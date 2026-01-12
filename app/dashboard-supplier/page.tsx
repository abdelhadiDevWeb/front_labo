"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowUpRight, Package, Loader2 } from "lucide-react";
import { getProfile, ClientData, getSupplierStatistics, SupplierStatistics } from "@/lib/api";
import Link from "next/link";

export default function SupplierDashboardPage() {
  const [userData, setUserData] = useState<ClientData | null>(null);
  const [statistics, setStatistics] = useState<SupplierStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setIsLoadingStats(true);
      
      // Load user profile
      const profileResult = await getProfile();
      if (profileResult.success && profileResult.data) {
        setUserData(profileResult.data);
      }
      setIsLoading(false);

      // Load statistics
      const statsResult = await getSupplierStatistics();
      if (statsResult.success && statsResult.data) {
        setStatistics(statsResult.data);
      }
      setIsLoadingStats(false);
    };
    
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-64 bg-white/20 rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-white/10 rounded animate-pulse"></div>
            </div>
          ) : userData ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                {getGreeting()}, {userData.firstName} {userData.lastName} 👋
              </h2>
              <p className="text-green-100 mb-4">Gérez vos produits et suivez vos ventes</p>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-green-200">Email:</span>
                  <span className="font-medium">{userData.email}</span>
                </div>
                {userData.phone && (
                  <div className="flex items-center gap-2 text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <span className="text-green-200">Téléphone:</span>
                    <span className="font-medium">{userData.phone}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Bienvenue dans votre Dashboard</h2>
              <p className="text-green-100">Gérez vos produits et suivez vos ventes</p>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : statistics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Total Revenue */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-500 p-3 rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              {statistics.ordersGrowth >= 0 ? (
                <span className="flex items-center text-green-600 text-sm font-semibold">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {statistics.ordersGrowth > 0 ? `+${statistics.ordersGrowth.toFixed(1)}%` : "0%"}
                </span>
              ) : (
                <span className="flex items-center text-red-600 text-sm font-semibold">
                  <ArrowUpRight className="w-4 h-4 mr-1 rotate-180" />
                  {statistics.ordersGrowth.toFixed(1)}%
                </span>
              )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Revenus Totaux</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {statistics.totalRevenue.toFixed(2)} DA
            </p>
          </div>

          {/* Products Sold */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500 p-3 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Produits Vendus</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {statistics.totalProductsSold}
            </p>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500 p-3 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Commandes</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {statistics.totalOrders}
            </p>
          </div>

          {/* Total Clients */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-500 p-3 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Clients</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {statistics.totalClients}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
          <p className="text-gray-500">Erreur lors du chargement des statistiques</p>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Commandes Récentes</h3>
          <Link
            href="/dashboard-supplier/orders"
            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
          >
            Voir toutes
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        {isLoadingStats ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-500">Chargement des commandes...</p>
          </div>
        ) : statistics && statistics.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics.recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = "/dashboard-supplier/orders"}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.buyer ? `${order.buyer.firstName} ${order.buyer.lastName}` : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.productsCount} produit{order.productsCount > 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {order.total.toFixed(2)} DA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === "arrived"
                            ? "bg-green-100 text-green-800"
                            : order.status === "en cours"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {order.status === "arrived" ? "Arrivée" : order.status === "en cours" ? "En cours" : "En route"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">Aucune commande récente</p>
            <p className="text-sm mt-1">Vos commandes récentes apparaîtront ici</p>
          </div>
        )}
      </div>
    </div>
  );
}

