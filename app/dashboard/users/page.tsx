"use client";

import { useState, useEffect } from "react";
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, Filter, Loader2, Ban, CheckCircle, XCircle, ChevronLeft, ChevronRight, User, Tag } from "lucide-react";
import { getAdminUsers, updateUserStatus, AdminUser } from "@/lib/api";

const roleLabels: { [key: string]: string } = {
  client: "Client",
  supplier: "Fournisseur",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState<{ [key: string]: number }>({});
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    // Reset to page 1 when search changes
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load all users (no role filter)
        const result = await getAdminUsers({
          search: searchQuery || undefined,
          page: currentPage,
          limit: 100, // Load more to show both sections
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (result.success && result.data) {
          setUsers(result.data.users);
          setTotalPages(result.data.pagination.totalPages);
          setTotalCount(result.data.pagination.totalCount);
          setRoleCounts(result.data.filters.roleCounts);
        } else {
          setError(result.message || "Erreur lors du chargement des utilisateurs");
        }
      } catch (err) {
        console.error("Load users error:", err);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (updatingStatus === userId) return;

    const newStatus = !currentStatus;
    setUpdatingStatus(userId);

    try {
      const result = await updateUserStatus(userId, newStatus);
      if (result.success) {
        // Update the user in the local state
        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.id === userId ? { ...user, status: newStatus } : user))
        );
      } else {
        alert(result.message || "Erreur lors de la mise à jour du statut");
      }
    } catch (err) {
      console.error("Update status error:", err);
      alert("Une erreur est survenue lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
          <p className="text-gray-500 mt-1">Gérez tous les utilisateurs de la plateforme</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
          <Plus className="w-5 h-5" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Chargement des utilisateurs...</span>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-white rounded-xl shadow-lg border border-gray-100">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Clients Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                Clients ({users.filter((u) => u.role === "client").length})
              </h3>
            </div>
            {users.filter((u) => u.role === "client").length === 0 ? (
              <div className="p-12 text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun client trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commandes
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d'inscription
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                      .filter((u) => u.role === "client")
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.firstName.charAt(0)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {user.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.status ? "Actif" : "Bloqué"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.ordersCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              disabled={updatingStatus === user.id}
                              className={`p-2 rounded-lg transition-all inline-flex items-center gap-1 ${
                                user.status
                                  ? "text-red-600 hover:text-red-900 hover:bg-red-50"
                                  : "text-green-600 hover:text-green-900 hover:bg-green-50"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={user.status ? "Bloquer le compte" : "Débloquer le compte"}
                            >
                              {updatingStatus === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.status ? (
                                <Ban className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              <span>{user.status ? "Bloquer" : "Débloquer"}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Suppliers Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-6 h-6 text-green-600" />
                Fournisseurs ({users.filter((u) => u.role === "supplier").length})
              </h3>
            </div>
            {users.filter((u) => u.role === "supplier").length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun fournisseur trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commandes
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d'inscription
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                      .filter((u) => u.role === "supplier")
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.firstName.charAt(0)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {user.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.status ? "Actif" : "Bloqué"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.ordersCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              disabled={updatingStatus === user.id}
                              className={`p-2 rounded-lg transition-all inline-flex items-center gap-1 ${
                                user.status
                                  ? "text-red-600 hover:text-red-900 hover:bg-red-50"
                                  : "text-green-600 hover:text-green-900 hover:bg-green-50"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={user.status ? "Bloquer le compte" : "Débloquer le compte"}
                            >
                              {updatingStatus === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.status ? (
                                <Ban className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              <span>{user.status ? "Bloquer" : "Débloquer"}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

