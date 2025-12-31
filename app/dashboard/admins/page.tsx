"use client";

import { useState } from "react";
import { Shield, Search, Plus, Edit, Trash2, Mail, Phone, Key } from "lucide-react";

const admins = [
  {
    id: 1,
    name: "Sophie Bernard",
    email: "sophie.bernard@marketlab.com",
    phone: "+33 6 11 22 33 44",
    role: "Super Admin",
    permissions: ["Tous les accès"],
    lastLogin: "2024-01-15 10:30",
    status: "Actif",
  },
  {
    id: 2,
    name: "Jean Admin",
    email: "jean.admin@marketlab.com",
    phone: "+33 6 55 66 77 88",
    role: "Admin",
    permissions: ["Gestion utilisateurs", "Gestion commandes"],
    lastLogin: "2024-01-15 09:15",
    status: "Actif",
  },
  {
    id: 3,
    name: "Marie Manager",
    email: "marie.manager@marketlab.com",
    phone: "+33 6 99 88 77 66",
    role: "Manager",
    permissions: ["Gestion commandes", "Statistiques"],
    lastLogin: "2024-01-14 16:45",
    status: "Actif",
  },
];

export default function AdminsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Super Admin":
        return "bg-purple-100 text-purple-800";
      case "Admin":
        return "bg-blue-100 text-blue-800";
      case "Manager":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Admins</h2>
          <p className="text-gray-500 mt-1">Gérez les administrateurs et leurs permissions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
          <Plus className="w-5 h-5" />
          <span>Nouvel Admin</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un administrateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAdmins.map((admin) => (
          <div
            key={admin.id}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{admin.name}</h3>
                  <p className="text-sm text-gray-500">{admin.email}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(admin.role)}`}>
                {admin.role}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                {admin.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Key className="w-4 h-4 text-gray-400" />
                Dernière connexion: {admin.lastLogin}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Permissions:</p>
              <div className="flex flex-wrap gap-2">
                {admin.permissions.map((permission, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                  >
                    {permission}
                  </span>
                ))}
              </div>
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

