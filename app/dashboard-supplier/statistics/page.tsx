"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  BarChart3,
  Award,
  Loader2,
  Calendar,
  ArrowUpRight,
  Star,
  TrendingDown,
  GitCompare,
} from "lucide-react";
import { getSupplierDetailedStatistics, DetailedSupplierStatistics } from "@/lib/api";

export default function SupplierStatisticsPage() {
  const [statistics, setStatistics] = useState<DetailedSupplierStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<"current" | "previous">("current");

  useEffect(() => {
    const loadStatistics = async () => {
      setIsLoading(true);
      const result = await getSupplierDetailedStatistics(selectedMonth);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
      setIsLoading(false);
    };
    loadStatistics();
  }, [selectedMonth]);

  // Helper function to format month name
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  };

  // Helper function to format date
  const formatDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-");
    return `${day}/${month}`;
  };

  // Calculate max values for charts
  const maxMonthlyRevenue = statistics
    ? Math.max(...Object.values(statistics.monthlyRevenue), 1)
    : 1;
  const maxDailyRevenue = statistics
    ? Math.max(...Object.values(statistics.dailyRevenue), 1)
    : 1;
  const maxProductQuantity = statistics
    ? Math.max(...statistics.bestProducts.map(p => p.quantity), 1)
    : 1;
  const maxCustomerSpent = statistics
    ? Math.max(...statistics.topCustomers.map(c => c.totalSpent), 1)
    : 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Erreur lors du chargement des statistiques</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
      <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Statistiques Détaillées</h1>
            <p className="text-green-100">Analysez vos performances et optimisez vos ventes</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Revenus Totaux</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {statistics.totalRevenue.toFixed(2)} DA
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Produits Vendus</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {statistics.totalProductsSold}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500 p-3 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Total Commandes</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {statistics.totalOrders}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-500 p-3 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Clients</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {statistics.totalClients}
          </p>
        </div>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenus Mensuels</h2>
              <p className="text-sm text-gray-500">6 derniers mois</p>
            </div>
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <div className="space-y-4">
            {Object.entries(statistics.monthlyRevenue)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, revenue]) => (
                <div key={month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{formatMonth(month)}</span>
                    <span className="text-gray-900 font-bold">{revenue.toFixed(2)} DA</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(revenue / maxMonthlyRevenue) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Daily Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenus Quotidiens</h2>
              <p className="text-sm text-gray-500">
                {statistics.dailyRevenueMonth || "Ce mois"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMonth("current")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMonth === "current"
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Ce mois
              </button>
              <button
                onClick={() => setSelectedMonth("previous")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMonth === "previous"
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Mois précédent
              </button>
            </div>
          </div>
          {Object.keys(statistics.dailyRevenue).length > 0 ? (
            <div className="space-y-4">
              <div className="h-64 flex items-end justify-between gap-1 pb-8">
                {Object.entries(statistics.dailyRevenue)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, revenue]) => (
                    <div key={date} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t transition-all duration-300 hover:from-blue-600 hover:to-cyan-600 group-hover:shadow-lg min-h-[4px]"
                        style={{ height: `${Math.max((revenue / maxDailyRevenue) * 100, 2)}%` }}
                        title={`${new Date(date).toLocaleDateString("fr-FR")}: ${revenue.toFixed(2)} DA`}
                      ></div>
                      <span className="text-[10px] text-gray-500 mt-1 absolute -bottom-6 whitespace-nowrap">
                        {new Date(date).getDate()}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {Object.entries(statistics.dailyRevenue)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, revenue]) => (
                      <div key={date} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">
                          {new Date(date).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {revenue.toFixed(2)} DA
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune donnée pour cette période</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Best Products and Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Selling Products */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500 p-2 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Meilleurs Produits</h2>
                <p className="text-sm text-gray-500">Par quantité vendue</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {statistics.bestProducts.length > 0 ? (
              statistics.bestProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{product.quantity} vendus</span>
                      <span>•</span>
                      <span>{product.revenue.toFixed(2)} DA</span>
                      <span>•</span>
                      <span>{product.orders} commande{product.orders > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                      style={{ width: `${(product.quantity / maxProductQuantity) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun produit vendu</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Meilleurs Clients</h2>
                <p className="text-sm text-gray-500">Par montant dépensé</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {statistics.topCustomers.length > 0 ? (
              statistics.topCustomers.map((customer, index) => (
                <div key={customer.buyer._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {customer.buyer.firstName.charAt(0)}{customer.buyer.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {customer.buyer.firstName} {customer.buyer.lastName}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{customer.totalSpent.toFixed(2)} DA</span>
                      <span>•</span>
                      <span>{customer.ordersCount} commande{customer.ordersCount > 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span>{customer.productsCount} produit{customer.productsCount > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-cyan-500 h-2 rounded-full"
                      style={{ width: `${(customer.totalSpent / maxCustomerSpent) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun client</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders and Revenue by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Commandes par Statut</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-900">En cours</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{statistics.ordersByStatus["en cours"]}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium text-gray-900">En route</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{statistics.ordersByStatus["on route"]}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Arrivées</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{statistics.ordersByStatus["arrived"]}</span>
            </div>
          </div>
        </div>

        {/* Revenue by Status */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Revenus par Statut</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">En cours</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {statistics.revenueByStatus["en cours"].toFixed(2)} DA
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${
                      (statistics.revenueByStatus["en cours"] /
                        (statistics.revenueByStatus["en cours"] +
                          statistics.revenueByStatus["on route"] +
                          statistics.revenueByStatus["arrived"] ||
                        1)) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">En route</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {statistics.revenueByStatus["on route"].toFixed(2)} DA
                </span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{
                    width: `${
                      (statistics.revenueByStatus["on route"] /
                        (statistics.revenueByStatus["en cours"] +
                          statistics.revenueByStatus["on route"] +
                          statistics.revenueByStatus["arrived"] ||
                        1)) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">Arrivées</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {statistics.revenueByStatus["arrived"].toFixed(2)} DA
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      (statistics.revenueByStatus["arrived"] /
                        (statistics.revenueByStatus["en cours"] +
                          statistics.revenueByStatus["on route"] +
                          statistics.revenueByStatus["arrived"] ||
                        1)) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Charts */}
      {statistics.comparison && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Month-over-Month Revenue Comparison */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-lg">
                  <GitCompare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Comparaison Mensuelle</h2>
                  <p className="text-sm text-gray-500">Revenus: Ce mois vs Mois précédent</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Ce mois</span>
                  <span className="text-lg font-bold text-gray-900">
                    {statistics.comparison.currentMonthRevenue.toFixed(2)} DA
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (statistics.comparison.currentMonthRevenue /
                          Math.max(
                            statistics.comparison.currentMonthRevenue,
                            statistics.comparison.previousMonthRevenue,
                            1
                          )) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Mois précédent</span>
                  <span className="text-lg font-bold text-gray-900">
                    {statistics.comparison.previousMonthRevenue.toFixed(2)} DA
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-4 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (statistics.comparison.previousMonthRevenue /
                          Math.max(
                            statistics.comparison.currentMonthRevenue,
                            statistics.comparison.previousMonthRevenue,
                            1
                          )) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Évolution</span>
                  <div className="flex items-center gap-2">
                    {statistics.comparison.revenueChange >= 0 ? (
                      <>
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-lg font-bold text-green-600">
                          +{statistics.comparison.revenueChange.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <span className="text-lg font-bold text-red-600">
                          {statistics.comparison.revenueChange.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Month-over-Month Orders Comparison */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Comparaison Commandes</h2>
                  <p className="text-sm text-gray-500">Commandes: Ce mois vs Mois précédent</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Ce mois</span>
                  <span className="text-lg font-bold text-gray-900">
                    {statistics.comparison.currentMonthOrders} commande{statistics.comparison.currentMonthOrders > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (statistics.comparison.currentMonthOrders /
                          Math.max(
                            statistics.comparison.currentMonthOrders,
                            statistics.comparison.previousMonthOrders,
                            1
                          )) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Mois précédent</span>
                  <span className="text-lg font-bold text-gray-900">
                    {statistics.comparison.previousMonthOrders} commande{statistics.comparison.previousMonthOrders > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-4 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (statistics.comparison.previousMonthOrders /
                          Math.max(
                            statistics.comparison.currentMonthOrders,
                            statistics.comparison.previousMonthOrders,
                            1
                          )) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Évolution</span>
                  <div className="flex items-center gap-2">
                    {statistics.comparison.ordersChange >= 0 ? (
                      <>
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-lg font-bold text-green-600">
                          +{statistics.comparison.ordersChange.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <span className="text-lg font-bold text-red-600">
                          {statistics.comparison.ordersChange.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Products by Revenue Comparison */}
      {statistics.topProductsByRevenue && statistics.topProductsByRevenue.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Top Produits par Revenus</h2>
                <p className="text-sm text-gray-500">Comparaison des revenus générés par produit</p>
        </div>
      </div>
          </div>
          <div className="space-y-4">
            {statistics.topProductsByRevenue.map((product, index) => {
              const maxRevenue = Math.max(...statistics.topProductsByRevenue!.map(p => p.revenue), 1);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {product.revenue.toFixed(2)} DA
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
