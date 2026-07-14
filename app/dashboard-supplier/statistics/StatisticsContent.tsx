"use client";

import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
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
  Activity,
} from "lucide-react";
import { getSupplierDetailedStatistics, DetailedSupplierStatistics } from "@/lib/api";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

  // Chart configurations - only create if data exists
  const monthlyRevenueBarConfig = statistics?.monthlyRevenue && Object.keys(statistics.monthlyRevenue).length > 0
    ? {
        labels: Object.entries(statistics.monthlyRevenue)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month]) => formatMonth(month)),
        datasets: [
          {
            label: "Revenus (DA)",
            data: Object.entries(statistics.monthlyRevenue)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([, revenue]) => revenue),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;


  const ordersByStatusPieConfig = statistics?.ordersByStatus
    ? {
        labels: Object.keys(statistics.ordersByStatus),
        datasets: [
          {
            data: [
              statistics.ordersByStatus["en cours"] || 0,
              statistics.ordersByStatus["on route"] || 0,
              statistics.ordersByStatus["arrived"] || 0,
            ],
            backgroundColor: [
              "rgba(239, 68, 68, 0.8)",
              "rgba(59, 130, 246, 0.8)",
              "rgba(16, 185, 129, 0.8)",
            ],
            borderColor: [
              "rgba(239, 68, 68, 1)",
              "rgba(59, 130, 246, 1)",
              "rgba(16, 185, 129, 1)",
            ],
            borderWidth: 2,
          },
        ],
      }
    : null;

  const topProductsBarConfig = statistics?.bestProducts && statistics.bestProducts.length > 0
    ? {
        labels: statistics.bestProducts.map((product) => product.name),
        datasets: [
          {
            label: "Quantité Vendue",
            data: statistics.bestProducts.map((product) => product.quantity),
            backgroundColor: "rgba(236, 72, 153, 0.8)",
            borderColor: "rgba(236, 72, 153, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  const topProductsByRevenueBarConfig = statistics?.topProductsByRevenue && statistics.topProductsByRevenue.length > 0
    ? {
        labels: statistics.topProductsByRevenue.map((product) => product.name),
        datasets: [
          {
            label: "Revenus (DA)",
            data: statistics.topProductsByRevenue.map((product) => product.revenue),
            backgroundColor: "rgba(251, 146, 60, 0.8)",
            borderColor: "rgba(251, 146, 60, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  const dailyRevenueScatterConfig = statistics?.dailyRevenue && Object.keys(statistics.dailyRevenue).length > 0
    ? {
        datasets: [
          {
            label: "Revenus Quotidiens",
            data: Object.entries(statistics.dailyRevenue)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, revenue], index) => ({
                x: index,
                y: revenue,
              })),
            backgroundColor: "rgba(168, 85, 247, 0.6)",
            borderColor: "rgba(168, 85, 247, 1)",
            pointRadius: 6,
            pointHoverRadius: 10,
          },
        ],
      }
    : null;

  const topCustomersBarConfig = statistics?.topCustomers && statistics.topCustomers.length > 0
    ? {
        labels: statistics.topCustomers.map((customer) => 
          `${customer.buyer.firstName} ${customer.buyer.lastName}`
        ),
        datasets: [
          {
            label: "Montant Dépensé (DA)",
            data: statistics.topCustomers.map((customer) => customer.totalSpent),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgba(34, 197, 94, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  const revenueByStatusDoughnutConfig = statistics?.revenueByStatus
    ? {
        labels: Object.keys(statistics.revenueByStatus),
        datasets: [
          {
            data: [
              statistics.revenueByStatus["en cours"] || 0,
              statistics.revenueByStatus["on route"] || 0,
              statistics.revenueByStatus["arrived"] || 0,
            ],
            backgroundColor: [
              "rgba(239, 68, 68, 0.8)",
              "rgba(59, 130, 246, 0.8)",
              "rgba(16, 185, 129, 0.8)",
            ],
            borderColor: [
              "rgba(239, 68, 68, 1)",
              "rgba(59, 130, 246, 1)",
              "rgba(16, 185, 129, 1)",
            ],
            borderWidth: 2,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            size: 12,
            weight: 600,
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
        },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const scatterChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Revenus (DA)",
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Jour",
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
  };

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
          <h3 className="text-gray-500 text-sm font-medium mb-1">Total Réserves</h3>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue - Bar Chart */}
        {monthlyRevenueBarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Revenus Mensuels</h3>
            </div>
            <div className="h-80">
              <Bar data={monthlyRevenueBarConfig} options={barChartOptions} />
                </div>
          </div>
        )}

        {/* Daily Revenue - Scatter Plot */}
        {dailyRevenueScatterConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
            <div>
                  <h3 className="text-lg font-bold text-gray-900">Revenus Quotidiens</h3>
              <p className="text-sm text-gray-500">
                {statistics.dailyRevenueMonth || "Ce mois"}
              </p>
                </div>
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
            <div className="h-80">
              <Scatter data={dailyRevenueScatterConfig} options={scatterChartOptions} />
            </div>
              </div>
            )}
      </div>

      {/* Orders by Status and Revenue by Status Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status - Pie Chart */}
        {ordersByStatusPieConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Réserves par Statut</h3>
            </div>
            <div className="h-80">
              <Pie data={ordersByStatusPieConfig} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Revenue by Status - Doughnut Chart */}
        {revenueByStatusDoughnutConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Revenus par Statut</h3>
            </div>
            <div className="h-80">
              <Doughnut data={revenueByStatusDoughnutConfig} options={chartOptions} />
            </div>
          </div>
        )}
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
                  <h2 className="text-xl font-bold text-gray-900">Comparaison Réserves</h2>
                  <p className="text-sm text-gray-500">Réserves: Ce mois vs Mois précédent</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Ce mois</span>
                  <span className="text-lg font-bold text-gray-900">
                    {statistics.comparison.currentMonthOrders} réserve{statistics.comparison.currentMonthOrders > 1 ? "s" : ""}
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
                    {statistics.comparison.previousMonthOrders} réserve{statistics.comparison.previousMonthOrders > 1 ? "s" : ""}
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

      {/* Full Width Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Products by Quantity - Bar Chart */}
        {topProductsBarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-pink-600" />
              <h3 className="text-lg font-bold text-gray-900">Top Produits par Quantité Vendue</h3>
            </div>
            <div className="h-80">
              <Bar data={topProductsBarConfig} options={barChartOptions} />
            </div>
          </div>
        )}

        {/* Top Products by Revenue - Bar Chart */}
        {topProductsByRevenueBarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900">Top Produits par Revenus</h3>
            </div>
            <div className="h-80">
              <Bar data={topProductsByRevenueBarConfig} options={barChartOptions} />
            </div>
          </div>
        )}

        {/* Top Customers - Bar Chart */}
        {topCustomersBarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Top Clients par Montant Dépensé</h3>
            </div>
            <div className="h-80">
              <Bar data={topCustomersBarConfig} options={barChartOptions} />
              </div>
        </div>
        )}
      </div>

      {/* Best Selling Products - Detailed List */}
      {statistics.bestProducts && statistics.bestProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Meilleurs Produits (Ventes Détaillées)</h2>
              <p className="text-sm text-gray-500">Vos produits les plus vendus avec statistiques complètes</p>
      </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom du Produit</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Quantité Vendue</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Nombre de Réserves</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenus Générés</th>
                </tr>
              </thead>
              <tbody>
                {statistics.bestProducts.map((product, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg text-white font-bold text-sm">
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {product.orders} réserve{product.orders > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold text-gray-900">{product.quantity}</span>
                        <span className="text-sm text-gray-500">unités</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-purple-500" />
                        <span className="font-semibold text-gray-900">{product.orders}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-green-600">{product.revenue.toFixed(2)} DA</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Unités Vendues</p>
                  <p className="text-xl font-bold text-gray-900">
                    {statistics.bestProducts.reduce((sum, p) => sum + p.quantity, 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Réserves</p>
                  <p className="text-xl font-bold text-gray-900">
                    {statistics.bestProducts.reduce((sum, p) => sum + p.orders, 0)}
                  </p>
                </div>
                    </div>
                  </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                  </div>
                <div>
                  <p className="text-sm text-gray-600">Revenus Totaux</p>
                  <p className="text-xl font-bold text-gray-900">
                    {statistics.bestProducts.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)} DA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
