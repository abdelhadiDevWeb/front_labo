"use client";

import { useState } from "react";
import { CreditCard, Search, Plus, Edit, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";

const subscriptions = [
  {
    id: 1,
    name: "Abonnement Premium",
    price: "99€/mois",
    duration: "1 mois",
    users: 150,
    status: "Actif",
    features: ["Accès complet", "Support prioritaire", "API illimitée"],
  },
  {
    id: 2,
    name: "Abonnement Standard",
    price: "49€/mois",
    duration: "1 mois",
    users: 320,
    status: "Actif",
    features: ["Accès standard", "Support email"],
  },
  {
    id: 3,
    name: "Abonnement Enterprise",
    price: "299€/mois",
    duration: "1 mois",
    users: 45,
    status: "Actif",
    features: ["Accès complet", "Support 24/7", "API illimitée", "Personnalisation"],
  },
  {
    id: 4,
    name: "Abonnement Basique",
    price: "29€/mois",
    duration: "1 mois",
    users: 180,
    status: "Suspendu",
    features: ["Accès limité"],
  },
];

export default function SubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Actif":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "Suspendu":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Abonnements</h2>
          <p className="text-gray-500 mt-1">Gérez les plans d'abonnement et les tarifs</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
          <Plus className="w-5 h-5" />
          <span>Nouvel Abonnement</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un abonnement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSubscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{subscription.name}</h3>
                  <p className="text-sm text-gray-500">{subscription.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(subscription.status)}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    subscription.status === "Actif"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {subscription.status}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 mb-2">{subscription.price}</p>
              <p className="text-sm text-gray-500">{subscription.users} utilisateurs</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Fonctionnalités:</p>
              <ul className="space-y-1">
                {subscription.features.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200">
                <Edit className="w-4 h-4" />
                <span>Modifier</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all duration-200">
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

