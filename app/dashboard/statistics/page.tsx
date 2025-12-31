"use client";

import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, BarChart3 } from "lucide-react";

const chartData = {
  revenue: [
    { month: "Jan", value: 42000 },
    { month: "Fév", value: 51000 },
    { month: "Mar", value: 48000 },
    { month: "Avr", value: 62000 },
    { month: "Mai", value: 58000 },
    { month: "Juin", value: 71000 },
  ],
  users: [
    { month: "Jan", value: 1200 },
    { month: "Fév", value: 1450 },
    { month: "Mar", value: 1680 },
    { month: "Avr", value: 1920 },
    { month: "Mai", value: 2150 },
    { month: "Juin", value: 2400 },
  ],
  orders: [
    { month: "Jan", value: 450 },
    { month: "Fév", value: 520 },
    { month: "Mar", value: 480 },
    { month: "Avr", value: 610 },
    { month: "Mai", value: 580 },
    { month: "Juin", value: 720 },
  ],
};

const stats = [
  {
    title: "Revenus Mensuels",
    value: "€71,000",
    change: "+22.4%",
    trend: "up",
    icon: DollarSign,
    color: "bg-green-500",
  },
  {
    title: "Nouveaux Utilisateurs",
    value: "2,400",
    change: "+11.6%",
    trend: "up",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    title: "Commandes Total",
    value: "720",
    change: "+24.1%",
    trend: "up",
    icon: ShoppingCart,
    color: "bg-purple-500",
  },
  {
    title: "Taux de Conversion",
    value: "3.24%",
    change: "-0.8%",
    trend: "down",
    icon: BarChart3,
    color: "bg-orange-500",
  },
];

export default function StatisticsPage() {
  const maxRevenue = Math.max(...chartData.revenue.map((d) => d.value));
  const maxUsers = Math.max(...chartData.users.map((d) => d.value));
  const maxOrders = Math.max(...chartData.orders.map((d) => d.value));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Statistiques</h2>
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
                <div className={`flex items-center gap-1 text-sm font-semibold ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Revenus Mensuels</h3>
          <div className="flex items-end justify-between h-64 gap-2">
            {chartData.revenue.map((item, index) => (
              <div key={item.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg hover:from-green-600 hover:to-green-500 transition-all duration-300 cursor-pointer"
                    style={{ height: `${(item.value / maxRevenue) * 100}%` }}
                    title={`${item.month}: €${item.value.toLocaleString()}`}
                  />
                </div>
                <span className="mt-2 text-xs text-gray-500 font-medium">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Nouveaux Utilisateurs</h3>
          <div className="flex items-end justify-between h-64 gap-2">
            {chartData.users.map((item, index) => (
              <div key={item.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-all duration-300 cursor-pointer"
                    style={{ height: `${(item.value / maxUsers) * 100}%` }}
                    title={`${item.month}: ${item.value}`}
                  />
                </div>
                <span className="mt-2 text-xs text-gray-500 font-medium">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Chart */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Commandes Mensuelles</h3>
        <div className="flex items-end justify-between h-64 gap-2">
          {chartData.orders.map((item, index) => (
            <div key={item.month} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end h-full">
                <div
                  className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg hover:from-purple-600 hover:to-purple-500 transition-all duration-300 cursor-pointer"
                  style={{ height: `${(item.value / maxOrders) * 100}%` }}
                  title={`${item.month}: ${item.value}`}
                />
              </div>
              <span className="mt-2 text-xs text-gray-500 font-medium">{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

