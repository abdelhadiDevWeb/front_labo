"use client";

import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowUpRight, Package } from "lucide-react";

const stats = [
  {
    name: "Revenus Totaux",
    value: "€12,450",
    change: "+15.2%",
    changeType: "positive",
    icon: DollarSign,
    color: "bg-green-500",
  },
  {
    name: "Produits Vendus",
    value: "156",
    change: "+8.5%",
    changeType: "positive",
    icon: Package,
    color: "bg-blue-500",
  },
  {
    name: "Commandes",
    value: "89",
    change: "+12.3%",
    changeType: "positive",
    icon: ShoppingCart,
    color: "bg-purple-500",
  },
  {
    name: "Clients",
    value: "234",
    change: "+6.7%",
    changeType: "positive",
    icon: Users,
    color: "bg-orange-500",
  },
];

const recentOrders = [
  { id: 1, customer: "Jean Dupont", product: "Analyse de sang", amount: "89€", status: "En cours", date: "2024-01-15" },
  { id: 2, customer: "Marie Martin", product: "Test ADN", amount: "199€", status: "Complété", date: "2024-01-14" },
  { id: 3, customer: "Pierre Durand", product: "Analyse microbiologique", amount: "149€", status: "En attente", date: "2024-01-13" },
];

export default function SupplierDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Bienvenue dans votre Dashboard</h2>
        <p className="text-green-100">Gérez vos produits et suivez vos ventes</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
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
                ) : (
                  <span className="flex items-center text-red-600 text-sm font-semibold">
                    {stat.change}
                  </span>
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
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Commandes Récentes</h3>
        </div>
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
                  Produit
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
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {order.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === "Complété"
                          ? "bg-green-100 text-green-800"
                          : order.status === "En cours"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

