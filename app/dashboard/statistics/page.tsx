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
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Package,
  Loader2,
  Activity,
} from "lucide-react";
import { getAdminStatistics, getDetailedAdminStatistics, AdminStatistics, DetailedAdminStatistics } from "@/lib/api";

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

export default function StatisticsPage() {
  const [basicStats, setBasicStats] = useState<AdminStatistics | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedAdminStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [basicResult, detailedResult] = await Promise.all([
        getAdminStatistics(),
        getDetailedAdminStatistics(),
      ]);

      if (basicResult.success && basicResult.data) {
        setBasicStats(basicResult.data);
      }

      if (detailedResult.success && detailedResult.data) {
        setDetailedStats(detailedResult.data);
      }

      if (!basicResult.success && !detailedResult.success) {
        setError(basicResult.message || detailedResult.message || "Erreur lors du chargement");
      }
    } catch (err) {
      console.error("Load statistics error:", err);
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  // Chart configurations - only create if data exists
  const monthlyRevenueBarConfig = detailedStats?.monthlyRevenue && detailedStats.monthlyRevenue.length > 0
    ? {
        labels: detailedStats.monthlyRevenue.map((item) => item.month),
        datasets: [
          {
            label: "Revenus (DA)",
            data: detailedStats.monthlyRevenue.map((item) => item.revenue),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  const monthlyOrdersLineConfig = detailedStats?.monthlyRevenue && detailedStats.monthlyRevenue.length > 0
    ? {
        labels: detailedStats.monthlyRevenue.map((item) => item.month),
        datasets: [
          {
            label: "Commandes",
            data: detailedStats.monthlyRevenue.map((item) => item.orders),
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
        ],
      }
    : null;

  const ordersByStatusPieConfig = detailedStats?.ordersByStatus && detailedStats.ordersByStatus.length > 0
    ? {
        labels: detailedStats.ordersByStatus.map((item) => item.status),
        datasets: [
          {
            data: detailedStats.ordersByStatus.map((item) => item.count),
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

  const usersByRoleDoughnutConfig = detailedStats?.usersByRole && detailedStats.usersByRole.length > 0
    ? {
        labels: detailedStats.usersByRole.map((item) => item.role),
        datasets: [
          {
            data: detailedStats.usersByRole.map((item) => item.count),
            backgroundColor: [
              "rgba(139, 92, 246, 0.8)",
              "rgba(59, 130, 246, 0.8)",
              "rgba(16, 185, 129, 0.8)",
            ],
            borderColor: [
              "rgba(139, 92, 246, 1)",
              "rgba(59, 130, 246, 1)",
              "rgba(16, 185, 129, 1)",
            ],
            borderWidth: 2,
          },
        ],
      }
    : null;

  const productsByCategoryBarConfig = detailedStats?.productsByCategory && detailedStats.productsByCategory.length > 0
    ? {
        labels: detailedStats.productsByCategory.map((item) => item.category),
        datasets: [
          {
            label: "Produits",
            data: detailedStats.productsByCategory.map((item) => item.count),
            backgroundColor: "rgba(251, 146, 60, 0.8)",
            borderColor: "rgba(251, 146, 60, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  const dailyRevenueScatterConfig = detailedStats?.dailyRevenue && detailedStats.dailyRevenue.length > 0
    ? {
        datasets: [
          {
            label: "Revenus Quotidiens",
            data: detailedStats.dailyRevenue.map((item, index) => ({
              x: index,
              y: item.revenue,
            })),
            backgroundColor: "rgba(168, 85, 247, 0.6)",
            borderColor: "rgba(168, 85, 247, 1)",
            pointRadius: 6,
            pointHoverRadius: 10,
          },
        ],
      }
    : null;

  const topSuppliersBarConfig = detailedStats?.topSuppliers && detailedStats.topSuppliers.length > 0
    ? {
        labels: detailedStats.topSuppliers.map((item) => item.supplierName),
        datasets: [
          {
            label: "Revenus (DA)",
            data: detailedStats.topSuppliers.map((item) => item.totalRevenue),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgba(34, 197, 94, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  const topProductsBarConfig = detailedStats?.topProducts && detailedStats.topProducts.length > 0
    ? {
        labels: detailedStats.topProducts.map((item) => item.name),
        datasets: [
          {
            label: "Quantité Vendue",
            data: detailedStats.topProducts.map((item) => item.totalQuantity),
            backgroundColor: "rgba(236, 72, 153, 0.8)",
            borderColor: "rgba(236, 72, 153, 1)",
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
            weight: "600",
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold",
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
            weight: "bold",
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
            weight: "bold",
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
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadStatistics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const stats = basicStats
    ? [
        {
          title: "Revenus Totaux",
          value: `${basicStats.totalRevenue.toLocaleString("fr-FR")} DA`,
          change: `${basicStats.growth.revenue.percentage >= 0 ? "+" : ""}${basicStats.growth.revenue.percentage.toFixed(1)}%`,
          trend: basicStats.growth.revenue.percentage >= 0 ? "up" : "down",
          icon: DollarSign,
          color: "bg-green-500",
        },
        {
          title: "Total Utilisateurs",
          value: basicStats.totalUsers.toLocaleString("fr-FR"),
          change: `${basicStats.totalClients} clients, ${basicStats.totalSuppliers} fournisseurs`,
          trend: "up",
          icon: Users,
          color: "bg-blue-500",
        },
        {
          title: "Total Commandes",
          value: basicStats.totalOrders.toLocaleString("fr-FR"),
          change: `${basicStats.growth.orders.percentage >= 0 ? "+" : ""}${basicStats.growth.orders.percentage.toFixed(1)}%`,
          trend: basicStats.growth.orders.percentage >= 0 ? "up" : "down",
          icon: ShoppingCart,
          color: "bg-purple-500",
        },
        {
          title: "Total Produits",
          value: basicStats.totalProducts.toLocaleString("fr-FR"),
          change: "En stock",
          trend: "up",
          icon: Package,
          color: "bg-orange-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Statistiques Complètes</h2>
        <p className="text-gray-500 mt-1">Analyse détaillée des performances de la plateforme</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    stat.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
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

        {/* Monthly Orders - Line Chart */}
        {monthlyOrdersLineConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Commandes Mensuelles</h3>
            </div>
            <div className="h-80">
              <Line data={monthlyOrdersLineConfig} options={lineChartOptions} />
            </div>
          </div>
        )}

        {/* Orders by Status - Pie Chart */}
        {ordersByStatusPieConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Commandes par Statut</h3>
            </div>
            <div className="h-80">
              <Pie data={ordersByStatusPieConfig} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Users by Role - Doughnut Chart */}
        {usersByRoleDoughnutConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">Utilisateurs par Rôle</h3>
            </div>
            <div className="h-80">
              <Doughnut data={usersByRoleDoughnutConfig} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Products by Category - Bar Chart */}
        {productsByCategoryBarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900">Produits par Catégorie</h3>
            </div>
            <div className="h-80">
              <Bar data={productsByCategoryBarConfig} options={barChartOptions} />
            </div>
          </div>
        )}

        {/* Daily Revenue - Scatter Plot */}
        {dailyRevenueScatterConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">Revenus Quotidiens (30 derniers jours)</h3>
            </div>
            <div className="h-80">
              <Scatter data={dailyRevenueScatterConfig} options={scatterChartOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Full Width Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Suppliers - Bar Chart */}
        {topSuppliersBarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Top 10 Fournisseurs par Revenus</h3>
            </div>
            <div className="h-80">
              <Bar data={topSuppliersBarConfig} options={barChartOptions} />
            </div>
          </div>
        )}

        {/* Top Products - Bar Chart */}
        {topProductsBarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-pink-600" />
              <h3 className="text-lg font-bold text-gray-900">Top 10 Produits par Quantité Vendue</h3>
            </div>
            <div className="h-80">
              <Bar data={topProductsBarConfig} options={barChartOptions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
