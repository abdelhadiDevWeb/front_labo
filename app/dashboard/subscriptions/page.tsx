"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Search,
  Plus,
  Edit,
  User,
  Mail,
  Phone,
  Calendar,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Tag,
  FileText,
  Eye,
  Clock,
} from "lucide-react";
import {
  getUsersForSubscription,
  createSubscription,
  getAllSubscriptions,
  updateSubscription,
  getUserPapers,
  SubscriptionUser,
  Subscription,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  UserPapers,
} from "@/lib/api";

export default function SubscriptionsPage() {
  const [users, setUsers] = useState<SubscriptionUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchSubscriptions, setSearchSubscriptions] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPapersModal, setShowPapersModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SubscriptionUser | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedUserPapers, setSelectedUserPapers] = useState<UserPapers | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateSubscriptionData>({
    id_user: "",
    type: "",
    price: 0,
    start: "",
    end: "",
  });

  const [updateFormData, setUpdateFormData] = useState<UpdateSubscriptionData>({
    type: "",
    price: 0,
    start: "",
    end: "",
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadUsers(), loadSubscriptions()]);
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    try {
      const result = await getUsersForSubscription();
      if (result.success && result.data) {
        setUsers(result.data.users);
      } else {
        setError(result.message || "Erreur lors du chargement des utilisateurs");
      }
    } catch (err) {
      console.error("Load users error:", err);
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadSubscriptions = async () => {
    setIsLoadingSubscriptions(true);
    setError(null);
    try {
      const result = await getAllSubscriptions();
      if (result.success && result.data) {
        setSubscriptions(result.data.subscriptions);
      } else {
        setError(result.message || "Erreur lors du chargement des abonnements");
      }
    } catch (err) {
      console.error("Load subscriptions error:", err);
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createSubscription(createFormData);
      if (result.success && result.data) {
        setSuccess("Abonnement créé avec succès!");
        setCreateFormData({
          id_user: "",
          type: "",
          price: 0,
          start: "",
          end: "",
        });
        setShowCreateModal(false);
        setSelectedUser(null);
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la création de l'abonnement");
        if (result.errors) {
          setError(result.errors.join(", "));
        }
      }
    } catch (err) {
      console.error("Create subscription error:", err);
      setError("Une erreur est survenue lors de la création");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscription) return;

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateSubscription(selectedSubscription._id, updateFormData);
      if (result.success && result.data) {
        setSuccess("Abonnement mis à jour avec succès!");
        setShowUpdateModal(false);
        setSelectedSubscription(null);
        await loadSubscriptions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la mise à jour");
        if (result.errors) {
          setError(result.errors.join(", "));
        }
      }
    } catch (err) {
      console.error("Update subscription error:", err);
      setError("Une erreur est survenue lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenCreateModal = (user: SubscriptionUser) => {
    setSelectedUser(user);
    const today = new Date().toISOString().split("T")[0];
    setCreateFormData({
      id_user: user._id,
      type: "",
      price: 0,
      start: today,
      end: "",
    });
    setShowCreateModal(true);
  };

  const handleOpenUpdateModal = (subscription: Subscription) => {
    if (subscription.status === "ended") {
      setError("Impossible de modifier un abonnement terminé");
      return;
    }
    setSelectedSubscription(subscription);
    setUpdateFormData({
      type: subscription.type,
      price: subscription.price,
      start: subscription.start.split("T")[0],
      end: subscription.end.split("T")[0],
    });
    setShowUpdateModal(true);
  };

  const handleOpenPapersModal = async (user: SubscriptionUser) => {
    setIsLoadingPapers(true);
    setSelectedUserPapers(null);
    setShowPapersModal(true);
    setError(null);
    try {
      const result = await getUserPapers(user._id);
      if (result.success && result.data) {
        setSelectedUserPapers(result.data.papers);
      } else {
        setError(result.message || "Erreur lors du chargement des papiers");
      }
    } catch (err) {
      console.error("Load papers error:", err);
      setError("Une erreur est survenue lors du chargement des papiers");
    } finally {
      setIsLoadingPapers(false);
    }
  };

  const getFileUrl = (filePath: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";
    return `${baseUrl}/${filePath}`;
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchUsers.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const clients = filteredUsers.filter((user) => user.role === "client");
  const suppliers = filteredUsers.filter((user) => user.role === "supplier");

  const filteredSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.id_user.firstName.toLowerCase().includes(searchSubscriptions.toLowerCase()) ||
      subscription.id_user.lastName.toLowerCase().includes(searchSubscriptions.toLowerCase()) ||
      subscription.id_user.email.toLowerCase().includes(searchSubscriptions.toLowerCase()) ||
      subscription.type.toLowerCase().includes(searchSubscriptions.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Abonnements</h2>
        <p className="text-gray-500 mt-1">Gérez les abonnements des utilisateurs</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Section 1: Users with status false - Divided into Clients and Suppliers */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Utilisateurs en attente d'abonnement</h3>
              <p className="text-sm text-gray-500 mt-1">Utilisateurs avec le statut inactif</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Clients Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Clients ({clients.length})
            </h4>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : clients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((user) => (
                  <div
                    key={user._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.firstName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {user.phone}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenPapersModal(user)}
                      className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Voir les papiers
                    </button>
                    <button
                      onClick={() => handleOpenCreateModal(user)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Créer un abonnement
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucun client en attente</p>
              </div>
            )}
          </div>

          {/* Suppliers Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-600" />
              Fournisseurs ({suppliers.length})
            </h4>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : suppliers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map((user) => (
                  <div
                    key={user._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.firstName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {user.phone}
                      </div>
        </div>
                    <button
                      onClick={() => handleOpenPapersModal(user)}
                      className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Voir les papiers
                    </button>
                    <button
                      onClick={() => handleOpenCreateModal(user)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Créer un abonnement
        </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucun fournisseur en attente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: All Subscriptions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Tous les abonnements</h3>
            <p className="text-sm text-gray-500 mt-1">Gérer les abonnements existants</p>
          </div>
      </div>

        {/* Search */}
        <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un abonnement..."
              value={searchSubscriptions}
              onChange={(e) => setSearchSubscriptions(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

        {/* Subscriptions List */}
        {isLoadingSubscriptions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredSubscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubscriptions.map((subscription) => (
          <div
                key={subscription._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
                <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                      <h4 className="font-semibold text-gray-900">{subscription.type}</h4>
                      <p className="text-sm text-gray-500">
                        {subscription.id_user.firstName} {subscription.id_user.lastName}
                      </p>
                </div>
              </div>
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      subscription.status === "active"
                      ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                    {subscription.status === "active" ? "Actif" : "Terminé"}
                </span>
              </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    {subscription.price.toLocaleString("fr-FR")} DA
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    Du {new Date(subscription.start).toLocaleDateString("fr-FR")} au{" "}
                    {new Date(subscription.end).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {subscription.id_user.email}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenUpdateModal(subscription)}
                  disabled={subscription.status === "ended"}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    subscription.status === "ended"
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  {subscription.status === "ended" ? "Terminé" : "Modifier"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucun abonnement trouvé</p>
          </div>
        )}
            </div>

      {/* Create Subscription Modal */}
      {mounted && showCreateModal && selectedUser && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Créer un abonnement</h3>
                  <p className="text-sm text-blue-100 mt-0.5">
                    Pour {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedUser(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubscription} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Type d'abonnement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.type}
                  onChange={(e) => setCreateFormData({ ...createFormData, type: e.target.value })}
                  placeholder="Ex: Premium, Standard, Basic"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Prix (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={createFormData.price}
                  onChange={(e) => setCreateFormData({ ...createFormData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createFormData.start}
                  onChange={(e) => setCreateFormData({ ...createFormData, start: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createFormData.end}
                  onChange={(e) => setCreateFormData({ ...createFormData, end: e.target.value })}
                  min={createFormData.start}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer"
                  )}
                </button>
              </div>
            </form>
              </div>
            </div>,
        document.body
      )}

      {/* Update Subscription Modal */}
      {mounted && showUpdateModal && selectedSubscription && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Edit className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Modifier l'abonnement</h3>
                  <p className="text-sm text-blue-100 mt-0.5">
                    {selectedSubscription.id_user.firstName} {selectedSubscription.id_user.lastName}
                  </p>
            </div>
            </div>
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedSubscription(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubscription} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Type d'abonnement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={updateFormData.type}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Prix (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={updateFormData.price}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={updateFormData.start}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, start: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={updateFormData.end}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, end: e.target.value })}
                  min={updateFormData.start}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedSubscription(null);
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    "Mettre à jour"
                  )}
                </button>
              </div>
            </form>
          </div>
            </div>,
        document.body
      )}

      {/* Papers Modal */}
      {mounted && showPapersModal && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Papiers de l'utilisateur</h3>
                  <p className="text-sm text-blue-100 mt-0.5">Documents d'identité et certificats</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPapersModal(false);
                  setSelectedUserPapers(null);
                  setError(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              {isLoadingPapers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : selectedUserPapers ? (
                <div className="space-y-6">
                  {/* Papers Details */}
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Informations des papiers
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-semibold text-gray-600 block mb-1">Type:</span>
                        <span className="text-gray-900 font-medium capitalize">{selectedUserPapers.type}</span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600 block mb-1">Date de création:</span>
                        <span className="text-gray-900 text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {new Date(selectedUserPapers.createdAt).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                </span>
              </div>
            </div>
            </div>

                  {/* Identity Document */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Carte d'identité
                    </h4>
                    <div className="flex gap-3">
                      <a
                        href={getFileUrl(selectedUserPapers.identity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Eye className="w-5 h-5" />
                        Voir
                      </a>
                    </div>
            </div>

                  {/* Tax Number (for suppliers) */}
                  {selectedUserPapers.type === "supplier" && selectedUserPapers.Tax_number && (
                    <div className="border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Numéro de taxe
                      </h4>
                      <div className="flex gap-3">
                        <a
                          href={getFileUrl(selectedUserPapers.Tax_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Eye className="w-5 h-5" />
                          Voir
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Commercial Register (for suppliers) */}
                  {selectedUserPapers.type === "supplier" && selectedUserPapers.commercial_register && (
                    <div className="border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Registre commercial
                      </h4>
                      <div className="flex gap-3">
                        <a
                          href={getFileUrl(selectedUserPapers.commercial_register)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Eye className="w-5 h-5" />
                          Voir
                        </a>
            </div>
          </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Aucun papier trouvé pour cet utilisateur</p>
                </div>
              )}
      </div>
      </div>
        </div>,
        document.body
      )}
    </div>
  );
}
