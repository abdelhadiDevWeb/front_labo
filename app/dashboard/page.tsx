"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, Package, Loader2, UserCheck } from "lucide-react";
import { getAdminStatistics, AdminStatistics } from "@/lib/api";
import Link from "next/link";

const statusLabels: { [key: string]: string } = {
  "en cours": "En cours",
  "on route": "En route",
  "arrived": "Livré",
};

const statusColors: { [key: string]: string } = {
  "en cours": "bg-blue-100 text-blue-800",
  "on route": "bg-yellow-100 text-yellow-800",
  "arrived": "bg-green-100 text-green-800",
};

export default function DashboardPage() {
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatistics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAdminStatistics();
        if (result.success && result.data) {
          setStatistics(result.data);
        } else {
          setError(result.message || "Erreur lors du chargement des statistiques");
        }
      } catch (err) {
        console.error("Load statistics error:", err);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " DA";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("fr-FR").format(num);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Erreur lors du chargement des données"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: "Revenus Totaux",
      value: formatCurrency(statistics.totalRevenue),
      change: `${statistics.growth.revenue.percentage >= 0 ? "+" : ""}${statistics.growth.revenue.percentage.toFixed(1)}%`,
      changeType: statistics.growth.revenue.percentage >= 0 ? "positive" : "negative",
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      name: "Total Utilisateurs",
      value: formatNumber(statistics.totalUsers),
      change: `${statistics.totalClients} clients, ${statistics.totalSuppliers} fournisseurs`,
      changeType: "info" as const,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      name: "Total Commandes",
      value: formatNumber(statistics.totalOrders),
      change: `${statistics.growth.orders.percentage >= 0 ? "+" : ""}${statistics.growth.orders.percentage.toFixed(1)}%`,
      changeType: statistics.growth.orders.percentage >= 0 ? "positive" : "negative",
      icon: ShoppingCart,
      color: "bg-purple-500",
    },
    {
      name: "Total Produits",
      value: formatNumber(statistics.totalProducts),
      change: "En stock",
      changeType: "info" as const,
      icon: Package,
      color: "bg-orange-500",
    },
  ];
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Bienvenue dans le Dashboard</h2>
        <p className="text-blue-100">Voici un aperçu de votre activité aujourd'hui</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {stat.changeType === "positive" ? (
                  <span className="flex items-center text-green-600 text-sm font-semibold">
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    {stat.change}
                  </span>
                ) : stat.changeType === "negative" ? (
                  <span className="flex items-center text-red-600 text-sm font-semibold">
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    {stat.change}
                  </span>
                ) : (
                  <span className="text-gray-600 text-xs font-medium">{stat.change}</span>
                )}
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.name}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Commandes Récentes</h3>
          <Link
            href="/dashboard/orders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Voir toutes →
          </Link>
        </div>
        {statistics.recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande récente</p>
          </div>
        ) : (
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
                    Fournisseur
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
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.productCount} {order.productCount > 1 ? "produits" : "produit"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

