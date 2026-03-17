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
  getAllSubscriptionTypes,
  createSubscriptionType,
  updateSubscriptionType,
  deleteSubscriptionType,
  SubscriptionType,
  CreateSubscriptionTypeData,
  UpdateSubscriptionTypeData,
} from "@/lib/api";
import { getBaseUrl } from "@/lib/api-config";

export default function SubscriptionsPage() {
  const [users, setUsers] = useState<SubscriptionUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchSubscriptions, setSearchSubscriptions] = useState("");
  const [searchTypes, setSearchTypes] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPapersModal, setShowPapersModal] = useState(false);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [showUpdateTypeModal, setShowUpdateTypeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SubscriptionUser | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedUserPapers, setSelectedUserPapers] = useState<UserPapers | null>(null);
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [isUpdatingType, setIsUpdatingType] = useState(false);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [isRenewing, setIsRenewing] = useState<string | null>(null); // Track which user is being renewed
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateSubscriptionData>({
    id_user: "",
    typeId: "",
    start: "",
  });

  const [createTypeFormData, setCreateTypeFormData] = useState<CreateSubscriptionTypeData>({
    name: "",
    time: 1,
    price: 0,
  });

  const [updateTypeFormData, setUpdateTypeFormData] = useState<UpdateSubscriptionTypeData>({
    name: "",
    time: 1,
    price: 0,
  });

  const [durationUnit, setDurationUnit] = useState<"days" | "months">("months");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [updateDurationUnit, setUpdateDurationUnit] = useState<"days" | "months">("months");
  const [updateDurationMonths, setUpdateDurationMonths] = useState<number>(1);

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
    await Promise.all([loadUsers(), loadSubscriptions(), loadSubscriptionTypes()]);
  };

  const loadSubscriptionTypes = async () => {
    setIsLoadingTypes(true);
    setError(null);
    try {
      const result = await getAllSubscriptionTypes();
      if (result.success && result.data) {
        setSubscriptionTypes(result.data.subscriptionTypes);
      } else {
        setError(result.message || "Erreur lors du chargement des types d'abonnement");
      }
    } catch (err) {
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoadingTypes(false);
    }
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
          typeId: "",
          start: "",
        });
        setShowCreateModal(false);
        setSelectedUser(null);
        // Reload data to get updated user status (user should disappear from waiting list if status changed to true)
        await loadData();
        // Also trigger a custom event to update sidebar badge count
        window.dispatchEvent(new CustomEvent("subscriptionUpdated"));
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
      typeId: "",
      start: today,
    });
    setShowCreateModal(true);
  };

  const handleTypeChange = (typeId: string) => {
    const selectedType = subscriptionTypes.find((t) => t.id === typeId);
    if (selectedType) {
      const startDate = new Date(createFormData.start);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selectedType.time);
      
      setCreateFormData({
        ...createFormData,
        typeId: typeId,
      });
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingType(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert months to days if needed
      const timeInDays = durationUnit === "months" ? durationMonths * 30 : createTypeFormData.time;
      const formDataToSend = {
        ...createTypeFormData,
        time: timeInDays,
      };

      const result = await createSubscriptionType(formDataToSend);
      if (result.success && result.data) {
        setSuccess("Type d'abonnement créé avec succès!");
        setCreateTypeFormData({
          name: "",
          time: 1,
          price: 0,
        });
        setDurationMonths(1);
        setDurationUnit("months");
        setShowCreateTypeModal(false);
        await loadSubscriptionTypes();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la création");
        if (result.errors) {
          setError(result.errors.join(", "));
        }
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la création");
    } finally {
      setIsCreatingType(false);
    }
  };

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    setIsUpdatingType(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert months to days if needed
      const timeInDays = updateDurationUnit === "months" ? updateDurationMonths * 30 : updateTypeFormData.time;
      const formDataToSend = {
        ...updateTypeFormData,
        time: timeInDays,
      };

      const result = await updateSubscriptionType(selectedType.id, formDataToSend);
      if (result.success && result.data) {
        setSuccess("Type d'abonnement mis à jour avec succès!");
        setShowUpdateTypeModal(false);
        setSelectedType(null);
        await loadSubscriptionTypes();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la mise à jour");
        if (result.errors) {
          setError(result.errors.join(", "));
        }
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la mise à jour");
    } finally {
      setIsUpdatingType(false);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type d'abonnement ?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const result = await deleteSubscriptionType(typeId);
      if (result.success) {
        setSuccess("Type d'abonnement supprimé avec succès!");
        await loadSubscriptionTypes();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la suppression");
    }
  };

  const handleOpenUpdateTypeModal = (type: SubscriptionType) => {
    setSelectedType(type);
    // Convert days to months for display (if divisible by 30)
    const days = type.time;
    const months = Math.round(days / 30);
    const isRoughlyMonths = Math.abs(days - months * 30) <= 2; // Allow 2 days tolerance
    
    if (isRoughlyMonths && months > 0) {
      setUpdateDurationUnit("months");
      setUpdateDurationMonths(months);
      setUpdateTypeFormData({
        name: type.name,
        time: days,
        price: type.price,
      });
    } else {
      setUpdateDurationUnit("days");
      setUpdateDurationMonths(1);
      setUpdateTypeFormData({
        name: type.name,
        time: days,
        price: type.price,
      });
    }
    setShowUpdateTypeModal(true);
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
    const baseUrl = getBaseUrl();
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

  // Helper function to check if user has expired subscriptions
  const getUserExpiredSubscriptions = (userId: string) => {
    return subscriptions.filter((sub) => {
      if (!sub.id_user) return false;
      // Handle both object and string formats
      const subUserId = typeof sub.id_user === "string" ? sub.id_user : sub.id_user._id;
      const isUserMatch = subUserId === userId;
      const isExpired = new Date(sub.end) < new Date();
      return isUserMatch && isExpired;
    });
  };

  // Helper function to get the last expired subscription
  const getLastExpiredSubscription = (userId: string) => {
    const expired = getUserExpiredSubscriptions(userId);
    if (expired.length === 0) return null;
    // Sort by end date descending and get the most recent one
    return expired.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())[0];
  };

  // Function to renew subscription
  const handleRenewSubscription = async (user: SubscriptionUser) => {
    setIsRenewing(user._id);
    setError(null);
    setSuccess(null);

    try {
      const lastExpired = getLastExpiredSubscription(user._id);
      if (!lastExpired) {
        setError("Aucun abonnement expiré trouvé");
        setIsRenewing(null);
        return;
      }

      // Find matching subscription type by name
      const matchingType = subscriptionTypes.find((type) => type.name === lastExpired.type);
      
      if (!matchingType) {
        // If no matching type found, try to create with old format
        // But we need typeId for the new API, so we'll show an error
        setError(`Type d'abonnement "${lastExpired.type}" non trouvé. Veuillez créer un nouveau type d'abonnement avec ce nom.`);
        setIsRenewing(null);
        return;
      }

      // Create new subscription with the same type, starting from today
      const today = new Date();
      const result = await createSubscription({
        id_user: user._id,
        typeId: matchingType.id,
        start: today.toISOString().split("T")[0],
      });

      if (result.success && result.data) {
        setSuccess(`Abonnement renouvelé avec succès pour ${user.firstName} ${user.lastName}!`);
        // Reload data to get updated user status (user should disappear from waiting list if status changed to true)
        await loadData();
        // Also trigger a custom event to update sidebar badge count
        window.dispatchEvent(new CustomEvent("subscriptionUpdated"));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors du renouvellement");
        if (result.errors) {
          setError(result.errors.join(", "));
        }
      }
    } catch (err) {
      console.error("Renew subscription error:", err);
      setError("Une erreur est survenue lors du renouvellement");
    } finally {
      setIsRenewing(null);
    }
  };

  const filteredSubscriptions = subscriptions.filter(
    (subscription) => {
      if (!subscription.id_user) {
        // If id_user is null, only filter by type
        return subscription.type.toLowerCase().includes(searchSubscriptions.toLowerCase());
      }
      const searchLower = searchSubscriptions.toLowerCase();
      return (
        (subscription.id_user.firstName?.toLowerCase() || "").includes(searchLower) ||
        (subscription.id_user.lastName?.toLowerCase() || "").includes(searchLower) ||
        (subscription.id_user.email?.toLowerCase() || "").includes(searchLower) ||
        subscription.type.toLowerCase().includes(searchLower)
      );
    }
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
                    {/* Check for expired subscriptions */}
                    {(() => {
                      const expiredSubs = getUserExpiredSubscriptions(user._id);
                      const lastExpired = getLastExpiredSubscription(user._id);
                      if (expiredSubs.length > 0 && lastExpired) {
                        return (
                          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-800 mb-2">
                              <strong>⚠️ Abonnement expiré:</strong> Cet utilisateur a {expiredSubs.length} abonnement(s) expiré(s).
                              {lastExpired && (
                                <span className="block mt-1">
                                  Dernier: {lastExpired.type} (expiré le {new Date(lastExpired.end).toLocaleDateString("fr-FR")})
                                </span>
                              )}
                            </p>
                            <button
                              onClick={() => handleRenewSubscription(user)}
                              disabled={isRenewing === user._id}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isRenewing === user._id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Renouvellement...
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  Renouveler l'abonnement
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
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
                    {/* Check for expired subscriptions */}
                    {(() => {
                      const expiredSubs = getUserExpiredSubscriptions(user._id);
                      const lastExpired = getLastExpiredSubscription(user._id);
                      if (expiredSubs.length > 0 && lastExpired) {
                        return (
                          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-800 mb-2">
                              <strong>⚠️ Abonnement expiré:</strong> Cet utilisateur a {expiredSubs.length} abonnement(s) expiré(s).
                              {lastExpired && (
                                <span className="block mt-1">
                                  Dernier: {lastExpired.type} (expiré le {new Date(lastExpired.end).toLocaleDateString("fr-FR")})
                                </span>
                              )}
                            </p>
                            <button
                              onClick={() => handleRenewSubscription(user)}
                              disabled={isRenewing === user._id}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isRenewing === user._id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Renouvellement...
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  Renouveler l'abonnement
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
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
                        {subscription.id_user 
                          ? `${subscription.id_user.firstName} ${subscription.id_user.lastName}`
                          : "Utilisateur supprimé"}
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
                    {subscription.id_user?.email || "N/A"}
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

      {/* Section 3: Subscription Types Management */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Types d'abonnement</h3>
            <p className="text-sm text-gray-500 mt-1">Gérer les types d'abonnement disponibles</p>
          </div>
          <button
            onClick={() => {
              setShowCreateTypeModal(true);
              setCreateTypeFormData({ name: "", time: 1, price: 0 });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter un type
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un type d'abonnement..."
              value={searchTypes}
              onChange={(e) => setSearchTypes(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Subscription Types List */}
        {isLoadingTypes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : subscriptionTypes.filter((type) =>
            type.name.toLowerCase().includes(searchTypes.toLowerCase())
          ).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptionTypes
              .filter((type) =>
                type.name.toLowerCase().includes(searchTypes.toLowerCase())
              )
              .map((type) => (
                <div
                  key={type.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Tag className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-500">Type d'abonnement</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      Durée: {(() => {
                        const days = type.time;
                        const months = Math.round(days / 30);
                        const isRoughlyMonths = Math.abs(days - months * 30) <= 2;
                        if (isRoughlyMonths && months > 0) {
                          return `${months} ${months === 1 ? "mois" : "mois"} (${days} jours)`;
                        }
                        return `${days} ${days === 1 ? "jour" : "jours"}`;
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Prix: {type.price.toLocaleString("fr-FR")} DA
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenUpdateTypeModal(type)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTypes
                ? "Aucun type d'abonnement trouvé"
                : "Aucun type d'abonnement disponible"}
            </p>
            {!searchTypes && (
              <button
                onClick={() => {
                  setShowCreateTypeModal(true);
                  setCreateTypeFormData({ name: "", time: 1, price: 0 });
                }}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                Créer le premier type
              </button>
            )}
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
            <form onSubmit={handleCreateSubscription} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Type d'abonnement <span className="text-red-500">*</span>
                </label>
                {subscriptionTypes.length > 0 ? (
                  <select
                    required
                    value={createFormData.typeId || ""}
                    onChange={(e) => {
                      handleTypeChange(e.target.value);
                      // Recalculate end date when start date changes
                      if (createFormData.start) {
                        const selectedType = subscriptionTypes.find((t) => t.id === e.target.value);
                        if (selectedType) {
                          const startDate = new Date(createFormData.start);
                          const endDate = new Date(startDate);
                          endDate.setDate(endDate.getDate() + selectedType.time);
                          // End date will be auto-calculated by backend, but we can show it
                        }
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  >
                    <option value="">Sélectionner un type d'abonnement</option>
                    {subscriptionTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.time} {type.time === 1 ? "jour" : "jours"} - {type.price.toLocaleString("fr-FR")} DA
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-yellow-200 bg-yellow-50 rounded-lg sm:rounded-xl text-xs sm:text-sm text-yellow-800">
                    Aucun type d'abonnement disponible. Veuillez créer un type d'abonnement d'abord.
                  </div>
                )}
                {createFormData.typeId && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
                    {(() => {
                      const selectedType = subscriptionTypes.find((t) => t.id === createFormData.typeId);
                      if (selectedType && createFormData.start) {
                        const startDate = new Date(createFormData.start);
                        const endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + selectedType.time);
                        return `Durée: ${selectedType.time} ${selectedType.time === 1 ? "jour" : "jours"} | Prix: ${selectedType.price.toLocaleString("fr-FR")} DA | Date de fin calculée: ${endDate.toLocaleDateString("fr-FR")}`;
                      }
                      return "";
                    })()}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createFormData.start}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setCreateFormData({ ...createFormData, start: newStart });
                    // Recalculate end date if type is selected
                    if (createFormData.typeId) {
                      const selectedType = subscriptionTypes.find((t) => t.id === createFormData.typeId);
                      if (selectedType && newStart) {
                        const startDate = new Date(newStart);
                        const endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + selectedType.time);
                        // End date will be auto-calculated by backend
                      }
                    }
                  }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              {createFormData.typeId && createFormData.start && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <strong>Résumé:</strong> La date de fin sera calculée automatiquement ({(() => {
                      const selectedType = subscriptionTypes.find((t) => t.id === createFormData.typeId);
                      if (selectedType) {
                        const startDate = new Date(createFormData.start);
                        const endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + selectedType.time);
                        return endDate.toLocaleDateString("fr-FR");
                      }
                      return "";
                    })()}) basée sur la durée du type sélectionné.
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !createFormData.typeId}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
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
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">Papiers de l'utilisateur</h3>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5">Documents d'identité et certificats</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPapersModal(false);
                  setSelectedUserPapers(null);
                  setError(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {error && (
                <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 text-red-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
                  {error}
                </div>
              )}
              {isLoadingPapers ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                </div>
              ) : selectedUserPapers ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Papers Details */}
                  <div className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-gray-50">
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      Informations des papiers
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-600 block mb-1">Type:</span>
                        <span className="text-sm sm:text-base text-gray-900 font-medium capitalize">{selectedUserPapers.type}</span>
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-600 block mb-1">Date de création:</span>
                        <span className="text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
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
                  <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      Carte d'identité
                    </h4>
                    <div className="flex gap-2 sm:gap-3">
                      <a
                        href={getFileUrl(selectedUserPapers.identity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
                      >
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        Voir
                      </a>
                    </div>
            </div>

                  {/* Tax Number (for suppliers) */}
                  {selectedUserPapers.type === "supplier" && selectedUserPapers.Tax_number && (
                    <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Numéro de taxe
                      </h4>
                      <div className="flex gap-2 sm:gap-3">
                        <a
                          href={getFileUrl(selectedUserPapers.Tax_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
                        >
                          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                          Voir
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Commercial Register (for suppliers) */}
                  {selectedUserPapers.type === "supplier" && selectedUserPapers.commercial_register && (
                    <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Registre commercial
                      </h4>
                      <div className="flex gap-2 sm:gap-3">
                        <a
                          href={getFileUrl(selectedUserPapers.commercial_register)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
                        >
                          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                          Voir
                        </a>
            </div>
          </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 text-sm sm:text-base md:text-lg">Aucun papier trouvé pour cet utilisateur</p>
                </div>
              )}
      </div>
      </div>
        </div>,
        document.body
      )}

      {/* Create Subscription Type Modal */}
      {mounted && showCreateTypeModal && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                  <Tag className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Créer un type d'abonnement</h3>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5">Définir un nouveau modèle d'abonnement</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateTypeModal(false);
                  setCreateTypeFormData({ name: "", time: 1, price: 0 });
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateType} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Nom du type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createTypeFormData.name}
                  onChange={(e) => setCreateTypeFormData({ ...createTypeFormData, name: e.target.value })}
                  placeholder="Ex: Premium, Standard, Basic"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                    Durée <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDurationUnit("months");
                        if (durationUnit === "days") {
                          setDurationMonths(Math.round(createTypeFormData.time / 30) || 1);
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        durationUnit === "months"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Mois
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDurationUnit("days");
                        if (durationUnit === "months") {
                          setCreateTypeFormData({ ...createTypeFormData, time: durationMonths * 30 });
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        durationUnit === "days"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Jours
                    </button>
                  </div>
                </div>
                {durationUnit === "months" ? (
                  <div>
                    <input
                      type="number"
                      required
                      min="1"
                      value={durationMonths}
                      onChange={(e) => {
                        const months = parseInt(e.target.value) || 1;
                        setDurationMonths(months);
                        setCreateTypeFormData({ ...createTypeFormData, time: months * 30 });
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {durationMonths} {durationMonths === 1 ? "mois" : "mois"} = {durationMonths * 30} jours
                    </p>
                  </div>
                ) : (
                  <input
                    type="number"
                    required
                    min="1"
                    value={createTypeFormData.time}
                    onChange={(e) => setCreateTypeFormData({ ...createTypeFormData, time: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Prix (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={createTypeFormData.price}
                  onChange={(e) => setCreateTypeFormData({ ...createTypeFormData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTypeModal(false);
                    setCreateTypeFormData({ name: "", time: 1, price: 0 });
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingType}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                >
                  {isCreatingType ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Créer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Update Subscription Type Modal */}
      {mounted && showUpdateTypeModal && selectedType && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                  <Edit className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Modifier le type d'abonnement</h3>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5">{selectedType.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUpdateTypeModal(false);
                  setSelectedType(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateType} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Nom du type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={updateTypeFormData.name}
                  onChange={(e) => setUpdateTypeFormData({ ...updateTypeFormData, name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                    Durée <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateDurationUnit("months");
                        if (updateDurationUnit === "days") {
                          setUpdateDurationMonths(Math.round(updateTypeFormData.time / 30) || 1);
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        updateDurationUnit === "months"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Mois
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateDurationUnit("days");
                        if (updateDurationUnit === "months") {
                          setUpdateTypeFormData({ ...updateTypeFormData, time: updateDurationMonths * 30 });
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        updateDurationUnit === "days"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Jours
                    </button>
                  </div>
                </div>
                {updateDurationUnit === "months" ? (
                  <div>
                    <input
                      type="number"
                      required
                      min="1"
                      value={updateDurationMonths}
                      onChange={(e) => {
                        const months = parseInt(e.target.value) || 1;
                        setUpdateDurationMonths(months);
                        setUpdateTypeFormData({ ...updateTypeFormData, time: months * 30 });
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {updateDurationMonths} {updateDurationMonths === 1 ? "mois" : "mois"} = {updateDurationMonths * 30} jours
                    </p>
                  </div>
                ) : (
                  <input
                    type="number"
                    required
                    min="1"
                    value={updateTypeFormData.time}
                    onChange={(e) => setUpdateTypeFormData({ ...updateTypeFormData, time: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Prix (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={updateTypeFormData.price}
                  onChange={(e) => setUpdateTypeFormData({ ...updateTypeFormData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateTypeModal(false);
                    setSelectedType(null);
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingType}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                >
                  {isUpdatingType ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Modifier
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
