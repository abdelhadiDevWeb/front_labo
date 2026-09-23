"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  Phone,
  Loader2,
  Ban,
  CheckCircle,
  Plus,
  User,
  Tag,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  getAdminUsers,
  updateUserStatus,
  updateUserCertife,
  deleteAdminUser,
  AdminUser,
  getSessionRole,
} from "@/lib/api";
import { isSouAdminRole } from "@/lib/admin-access";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingCertife, setUpdatingCertife] = useState<string | null>(null);
  const [canMutateUsers, setCanMutateUsers] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void getSessionRole().then((session) => {
      if (isSouAdminRole(session?.role)) {
        router.replace("/dashboard");
        return;
      }
      setAllowed(true);
      setCanMutateUsers(Boolean(session));
    });
  }, [router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!allowed) return;
    const loadUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAdminUsers({
          search: searchQuery || undefined,
          page: currentPage,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (result.success && result.data) {
          setUsers(result.data.users);
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

    const timeoutId = setTimeout(() => {
      loadUsers();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [allowed, searchQuery, currentPage]);

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

  const handleToggleCertife = async (userId: string, currentCertife: boolean) => {
    if (updatingCertife === userId) return;
    const newCertife = !currentCertife;
    setUpdatingCertife(userId);
    try {
      const result = await updateUserCertife(userId, newCertife);
      if (result.success) {
        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.id === userId ? { ...user, certife: newCertife } : user))
        );
      } else {
        alert(result.message || "Erreur lors de la mise a jour du certife");
      }
    } catch (err) {
      console.error("Update certife error:", err);
      alert("Une erreur est survenue lors de la mise a jour du certife");
    } finally {
      setUpdatingCertife(null);
    }
  };

  const openDeleteModal = (user: AdminUser) => {
    setDeleteError(null);
    setUserToDelete(user);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setUserToDelete(null);
    setDeleteError(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteAdminUser(userToDelete.id);
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else {
        setDeleteError(result.message || "Erreur lors de la suppression");
      }
    } catch {
      setDeleteError("Une erreur est survenue lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderActionButtons = (user: AdminUser) => {
    if (!canMutateUsers) {
      return <span className="text-xs text-gray-400">Lecture seule</span>;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleToggleStatus(user.id, user.status)}
          disabled={updatingStatus === user.id || isDeleting}
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
        <button
          onClick={() => openDeleteModal(user)}
          disabled={isDeleting}
          className="p-2 rounded-lg transition-all inline-flex items-center gap-1 text-red-700 hover:text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Supprimer définitivement"
        >
          <Trash2 className="w-4 h-4" />
          <span>Supprimer</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
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
                        Certifie
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commandes
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d&apos;inscription
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.ordersCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {renderActionButtons(user)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
                        Certifie
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commandes
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d&apos;inscription
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
                                {user.email ? (
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {user.phone || "—"}
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            {canMutateUsers ? (
                              <button
                                onClick={() => handleToggleCertife(user.id, !!user.certife)}
                                disabled={updatingCertife === user.id}
                                className={`p-2 rounded-lg transition-all inline-flex items-center gap-1 ${
                                  user.certife
                                    ? "text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={user.certife ? "Retirer certifie" : "Marquer certifie"}
                              >
                                {updatingCertife === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                <span>{user.certife ? "Certifie" : "Non certifie"}</span>
                              </button>
                            ) : (
                              <span className="text-sm text-gray-600">
                                {user.certife ? "Certifie" : "Non certifie"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.ordersCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {renderActionButtons(user)}
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

      {mounted &&
        userToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-user-title"
              className="relative z-[10000] w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-red-50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 id="delete-user-title" className="text-lg font-bold text-gray-900">
                      Confirmer la suppression
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {userToDelete.role === "supplier" ? "Fournisseur" : "Client"} :{" "}
                      <span className="font-semibold text-gray-900">{userToDelete.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-white/80 hover:text-gray-800 disabled:opacity-50"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
                {userToDelete.role === "supplier" ? (
                  <>
                    <p>
                      Vous êtes sur le point de <strong>supprimer définitivement</strong> ce
                      fournisseur.
                    </p>
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                      Tous les <strong>produits</strong> liés à cet fournisseur (ainsi que ses
                      machines et services) et <strong>tous ses abonnements</strong> seront
                      également <strong>supprimés</strong>. Cette action est irréversible.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Vous êtes sur le point de <strong>supprimer définitivement</strong> ce
                      client.
                    </p>
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                      Son compte, <strong>tous ses abonnements</strong> et ses données
                      d&apos;accès seront effacés. Cette action est irréversible.
                    </p>
                  </>
                )}
                {deleteError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                    {deleteError}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteUser()}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Suppression…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Oui, supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
