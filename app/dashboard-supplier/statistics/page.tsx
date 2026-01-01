"use client";

import { TrendingUp, Package, DollarSign, ShoppingCart } from "lucide-react";

export default function SupplierStatisticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Statistiques</h2>
        <p className="text-gray-500 mt-1">Analysez vos performances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Revenus</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">€12,450</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Produits</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">156</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500 p-3 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Commandes</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">89</p>
        </div>
      </div>
    </div>
  );
}

