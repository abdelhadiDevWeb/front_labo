"use client";

import { useState, useEffect, useMemo } from "react";
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
  Megaphone,
  Sparkles,
  Building2,
  HandCoins,
} from "lucide-react";
import {
  getUsersForSubscription,
  createSubscription,
  activateSubscriptionFromUserChoice,
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
  getSessionRole,
} from "@/lib/api";
import { getBaseUrl } from "@/lib/api-config";
import { useRouter } from "next/navigation";
import { isSouAdminRole } from "@/lib/admin-access";

export default function SubscriptionsPage() {
  const router = useRouter();
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
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateSubscriptionData>({
    id_user: "",
    typeId: "",
    start: "",
  });

  const [createTypeFormData, setCreateTypeFormData] = useState<CreateSubscriptionTypeData>({
    name: "",
    description: "",
    time: 1,
    price: 0,
    sponsorsPerMonth: 0,
    sponsorDurationHours: 48,
  });

  const [updateTypeFormData, setUpdateTypeFormData] = useState<UpdateSubscriptionTypeData>({
    name: "",
    description: "",
    time: 1,
    price: 0,
    sponsorsPerMonth: 0,
    sponsorDurationHours: 48,
  });

  const emptyCreateTypeForm = (): CreateSubscriptionTypeData => ({
    name: "",
    description: "",
    time: 1,
    price: 0,
    sponsorsPerMonth: 0,
    sponsorDurationHours: 48,
  });

  // Helper function to safely get time value
  const getUpdateTimeValue = (): number => {
    if (updateTypeFormData.time !== undefined && updateTypeFormData.time !== null) {
      return updateTypeFormData.time;
    }
    return 1;
  };

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
    void getSessionRole().then((session) => {
      if (isSouAdminRole(session?.role)) {
        router.replace("/dashboard");
        return;
      }
      loadData();
    });
  }, [router]);

  useEffect(() => {
    const handlePendingUsersUpdated = async () => {
      await loadUsers(true);
    };
    window.addEventListener("pendingUsersUpdated", handlePendingUsersUpdated);

    return () => {
      window.removeEventListener("pendingUsersUpdated", handlePendingUsersUpdated);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadUsers(false), loadSubscriptions(false), loadSubscriptionTypes(false)]);
  };

  const notifyPendingUsersUpdated = async () => {
    window.dispatchEvent(new CustomEvent("subscriptionUpdated"));
    try {
      const refreshed = await getUsersForSubscription();
      if (refreshed.success && refreshed.data) {
        window.dispatchEvent(
          new CustomEvent("pendingUsersUpdated", {
            detail: { count: refreshed.data.users?.length || 0 },
          })
        );
      }
    } catch {
      // layout will refresh on subscriptionUpdated
    }
  };

  const loadSubscriptionTypes = async (silent: boolean = false) => {
    if (!silent) {
    setIsLoadingTypes(true);
    setError(null);
    }
    try {
      const result = await getAllSubscriptionTypes();
      if (result.success && result.data) {
        setSubscriptionTypes(result.data.subscriptionTypes);
      } else if (!silent) {
        setError(result.message || "Erreur lors du chargement des types d'abonnement");
      }
    } catch (err) {
      if (!silent) {
      setError("Une erreur est survenue lors du chargement");
      }
    } finally {
      if (!silent) {
      setIsLoadingTypes(false);
      }
    }
  };

  const loadUsers = async (silent: boolean = false) => {
    if (!silent) {
    setIsLoadingUsers(true);
    setError(null);
    }
    try {
      const result = await getUsersForSubscription();
      if (result.success && result.data) {
        setUsers(result.data.users);
      } else if (!silent) {
        setError(result.message || "Erreur lors du chargement des utilisateurs");
      }
    } catch (err) {
      if (!silent) {
      console.error("Load users error:", err);
      setError("Une erreur est survenue lors du chargement");
      }
    } finally {
      if (!silent) {
      setIsLoadingUsers(false);
      }
    }
  };

  const loadSubscriptions = async (silent: boolean = false) => {
    if (!silent) {
    setIsLoadingSubscriptions(true);
    setError(null);
    }
    try {
      const result = await getAllSubscriptions();
      if (result.success && result.data) {
        setSubscriptions(result.data.subscriptions);
      } else if (!silent) {
        setError(result.message || "Erreur lors du chargement des abonnements");
      }
    } catch (err) {
      if (!silent) {
      console.error("Load subscriptions error:", err);
      setError("Une erreur est survenue lors du chargement");
      }
    } finally {
      if (!silent) {
      setIsLoadingSubscriptions(false);
      }
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
        await loadData();
        await notifyPendingUsersUpdated();
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
      const sponsors = createTypeFormData.sponsorsPerMonth ?? 0;
      const hours = createTypeFormData.sponsorDurationHours ?? 0;
      if (sponsors > 0 && hours < 1) {
        setError("Indiquez la durée de chaque sponsor en heures (minimum 1).");
        setIsCreatingType(false);
        return;
      }

      // Convert months to days if needed
      const timeInDays = durationUnit === "months" ? durationMonths * 30 : createTypeFormData.time;
      const formDataToSend = {
        ...createTypeFormData,
        time: timeInDays,
        sponsorDurationHours: sponsors > 0 ? hours : 0,
      };

      const result = await createSubscriptionType(formDataToSend);
      if (result.success && result.data) {
        setSuccess("Type d'abonnement créé avec succès!");
        setCreateTypeFormData(emptyCreateTypeForm());
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
      const sponsors = updateTypeFormData.sponsorsPerMonth ?? 0;
      const hours = updateTypeFormData.sponsorDurationHours ?? 0;
      if (sponsors > 0 && hours < 1) {
        setError("Indiquez la durée de chaque sponsor en heures (minimum 1).");
        setIsUpdatingType(false);
        return;
      }

      // Convert months to days if needed
      const timeInDays = updateDurationUnit === "months" ? updateDurationMonths * 30 : getUpdateTimeValue();
      const formDataToSend = {
        ...updateTypeFormData,
        time: timeInDays,
        sponsorDurationHours: sponsors > 0 ? hours : 0,
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
    
    const typeFormBase = {
      name: type.name,
      description: type.description || "",
      time: days,
      price: type.price,
      sponsorsPerMonth: type.sponsorsPerMonth ?? 0,
      sponsorDurationHours: type.sponsorDurationHours ?? 48,
    };
    if (isRoughlyMonths && months > 0) {
      setUpdateDurationUnit("months");
      setUpdateDurationMonths(months);
      setUpdateTypeFormData(typeFormBase);
    } else {
      setUpdateDurationUnit("days");
      setUpdateDurationMonths(1);
      setUpdateTypeFormData(typeFormBase);
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
        await loadData();
        await notifyPendingUsersUpdated();
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

  const handleActivateFromChoice = async (user: SubscriptionUser) => {
    if (!user.chosenSubscription) return;

    setIsActivating(user._id);
    setError(null);
    setSuccess(null);

    try {
      const result = await activateSubscriptionFromUserChoice(user._id);

      if (result.success) {
        setSuccess(
          `Abonnement "${user.chosenSubscription.name}" activé pour ${user.firstName} ${user.lastName} !`
        );
        await loadData();
        await notifyPendingUsersUpdated();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de l'activation");
      }
    } catch (err) {
      console.error("Activate from choice error:", err);
      setError("Une erreur est survenue lors de l'activation");
    } finally {
      setIsActivating(null);
    }
  };

  const renderChosenSubscription = (user: SubscriptionUser) => {
    if (!user.chosenSubscription) return null;

    const choice = user.chosenSubscription;
    const durationLabel =
      choice.time >= 30 && choice.time % 30 === 0
        ? `${choice.time / 30} mois`
        : `${choice.time} jour${choice.time > 1 ? "s" : ""}`;
    const sponsorsCount = choice.sponsorsPerMonth ?? 0;
    const sponsorHours =
      choice.sponsorDurationHours && choice.sponsorDurationHours >= 1
        ? choice.sponsorDurationHours
        : sponsorsCount > 0
          ? 48
          : 0;

    return (
      <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-xs font-semibold text-indigo-800 mb-1 flex items-center gap-1">
          <HandCoins className="w-3.5 h-3.5" />
          Abonnement souhaité (main propre)
        </p>
        <p className="text-sm font-bold text-gray-900">{choice.name}</p>
        <p className="text-sm text-gray-600">
          {choice.price.toLocaleString("fr-DZ")} DZD · {durationLabel}
        </p>
        {sponsorsCount > 0 ? (
          <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2 space-y-1.5">
            <p className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-amber-600" />
              {sponsorsCount} sponsor{sponsorsCount > 1 ? "s" : ""} inclus
            </p>
            <p className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Temps / sponsor&nbsp;: {sponsorHours} h
              {sponsorHours >= 24 && sponsorHours % 24 === 0
                ? ` (${sponsorHours / 24} jour${sponsorHours / 24 > 1 ? "s" : ""})`
                : ""}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-1">Aucun sponsoring inclus</p>
        )}
      </div>
    );
  };

  const renderSubscriptionButtons = (user: SubscriptionUser) => {
    if (user.chosenSubscription) {
      return (
        <>
          <button
            onClick={() => handleActivateFromChoice(user)}
            disabled={isActivating === user._id}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isActivating === user._id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Activation...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Activer l&apos;abonnement choisi
              </>
            )}
          </button>
          <button
            onClick={() => handleOpenCreateModal(user)}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Autre abonnement
          </button>
        </>
      );
    }

    return (
      <button
        onClick={() => handleOpenCreateModal(user)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Créer un abonnement
      </button>
    );
  };

  const filteredSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) => {
        if (!subscription.id_user) {
          return subscription.type.toLowerCase().includes(searchSubscriptions.toLowerCase());
        }
        const searchLower = searchSubscriptions.toLowerCase();
        return (
          (subscription.id_user.firstName?.toLowerCase() || "").includes(searchLower) ||
          (subscription.id_user.lastName?.toLowerCase() || "").includes(searchLower) ||
          (subscription.id_user.email?.toLowerCase() || "").includes(searchLower) ||
          subscription.type.toLowerCase().includes(searchLower)
        );
      }),
    [subscriptions, searchSubscriptions]
  );

  const supplierSubscriptions = useMemo(
    () => filteredSubscriptions.filter((s) => s.id_user?.role === "supplier"),
    [filteredSubscriptions]
  );

  const clientSubscriptions = useMemo(
    () => filteredSubscriptions.filter((s) => s.id_user?.role === "client"),
    [filteredSubscriptions]
  );

  const renderSubscriptionCard = (subscription: Subscription) => (
    <div
      key={subscription._id}
      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              subscription.id_user?.role === "supplier"
                ? "bg-purple-100"
                : "bg-blue-100"
            }`}
          >
            {subscription.id_user?.role === "supplier" ? (
              <Building2 className="w-5 h-5 text-purple-600" />
            ) : (
              <User className="w-5 h-5 text-blue-600" />
            )}
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
        {(subscription.sponsorsAllocated ?? subscription.sponsorsPerMonth ?? 0) > 0 ? (
          <div className="rounded-lg border border-purple-100 bg-purple-50/80 px-2.5 py-2 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-purple-800 font-medium">
              <Megaphone className="w-4 h-4" />
              {subscription.sponsorsPerMonth ?? 0} sponsor
              {(subscription.sponsorsPerMonth ?? 0) !== 1 ? "s" : ""} restant
              {(subscription.sponsorsPerMonth ?? 0) !== 1 ? "s" : ""}
              {(subscription.sponsorsAllocated ?? 0) > 0 &&
                ` / ${subscription.sponsorsAllocated} inclus`}
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-800 font-medium">
              <Clock className="w-4 h-4" />
              Temps / sponsor&nbsp;:{" "}
              {(() => {
                const hours =
                  subscription.sponsorDurationHours && subscription.sponsorDurationHours >= 1
                    ? subscription.sponsorDurationHours
                    : 48;
                if (hours >= 24 && hours % 24 === 0) {
                  const days = hours / 24;
                  return `${hours} h (${days} jour${days > 1 ? "s" : ""})`;
                }
                return `${hours} heure${hours > 1 ? "s" : ""}`;
              })()}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Megaphone className="w-4 h-4" />
            Aucun sponsoring inclus
          </div>
        )}
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
  );

  const renderSubscriptionsSection = (
    title: string,
    subtitle: string,
    items: Subscription[],
    emptyMessage: string,
    accent: "purple" | "blue"
  ) => (
    <div
      className={`rounded-2xl border p-5 ${
        accent === "purple"
          ? "border-purple-100 bg-purple-50/30"
          : "border-blue-100 bg-blue-50/30"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              accent === "purple" ? "bg-purple-100" : "bg-blue-100"
            }`}
          >
            {accent === "purple" ? (
              <Building2
                className={`w-5 h-5 ${accent === "purple" ? "text-purple-600" : "text-blue-600"}`}
              />
            ) : (
              <User className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            accent === "purple"
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(renderSubscriptionCard)}
        </div>
      ) : (
        <div className="text-center py-10 bg-white/70 rounded-xl border border-dashed border-gray-200">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      )}
    </div>
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
                    {renderChosenSubscription(user)}
                    {renderSubscriptionButtons(user)}
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
                    {renderChosenSubscription(user)}
                    {renderSubscriptionButtons(user)}
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

        {/* Subscriptions List — by role */}
        {isLoadingSubscriptions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredSubscriptions.length > 0 ? (
          <div className="space-y-6">
            {renderSubscriptionsSection(
              "Abonnements fournisseurs",
              "Suppliers avec abonnement actif ou terminé",
              supplierSubscriptions,
              "Aucun abonnement fournisseur trouvé",
              "purple"
            )}
            {renderSubscriptionsSection(
              "Abonnements clients",
              "Clients avec abonnement actif ou terminé",
              clientSubscriptions,
              "Aucun abonnement client trouvé",
              "blue"
            )}
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
              setCreateTypeFormData(emptyCreateTypeForm());
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
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Megaphone className="w-4 h-4" />
                      Sponsors inclus&nbsp;: {type.sponsorsPerMonth ?? 0}
                    </div>
                    {(type.sponsorsPerMonth ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-sm text-purple-700 font-medium">
                        <Clock className="w-4 h-4" />
                        Temps / sponsor&nbsp;:{" "}
                        {(() => {
                          const hours = type.sponsorDurationHours ?? 48;
                          if (hours >= 24 && hours % 24 === 0) {
                            const days = hours / 24;
                            return `${hours} h (${days} jour${days > 1 ? "s" : ""})`;
                          }
                          return `${hours} heure${hours > 1 ? "s" : ""}`;
                        })()}
                      </div>
                    )}
                    {type.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{type.description}</p>
                    )}
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
                  setCreateTypeFormData(emptyCreateTypeForm());
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
                        return `Durée: ${selectedType.time} ${selectedType.time === 1 ? "jour" : "jours"} | Prix: ${selectedType.price.toLocaleString("fr-FR")} DA | Sponsors/mois: ${selectedType.sponsorsPerMonth ?? 0}${(selectedType.sponsorsPerMonth ?? 0) > 0 ? ` (${selectedType.sponsorDurationHours ?? 48} h)` : ""} | Date de fin calculée: ${endDate.toLocaleDateString("fr-FR")}`;
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl min-h-[min(720px,90vh)] max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-cyan-600 to-indigo-700" />
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.2),transparent_40%)]" />
              <div className="relative px-6 sm:px-8 py-6 sm:py-7 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Nouveau type d&apos;abonnement
                    </h3>
                    <p className="text-sm sm:text-base text-blue-100/90 mt-1 max-w-lg">
                      Configurez un plan complet : durée, prix, description et sponsors inclus pour les fournisseurs.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTypeModal(false);
                    setCreateTypeFormData(emptyCreateTypeForm());
                  }}
                  className="text-white/90 hover:text-white hover:bg-white/15 p-2.5 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateType} className="flex-1 overflow-y-auto">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left column — identity */}
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5 space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                        <Tag className="w-4 h-4 text-blue-600" />
                        Informations générales
                      </h4>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nom du type <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={createTypeFormData.name}
                          onChange={(e) =>
                            setCreateTypeFormData({ ...createTypeFormData, name: e.target.value })
                          }
                          placeholder="Ex: Premium, Standard, Basic"
                          className="w-full px-4 py-3.5 text-base border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={createTypeFormData.description || ""}
                          onChange={(e) =>
                            setCreateTypeFormData({ ...createTypeFormData, description: e.target.value })
                          }
                          rows={6}
                          placeholder="Décrivez les avantages de ce type d'abonnement, les fonctionnalités incluses, les limites..."
                          className="w-full px-4 py-3.5 text-base border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none shadow-sm min-h-[160px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right column — pricing & options */}
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5 space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Tarification & durée
                      </h4>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Prix (DA) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={createTypeFormData.price}
                          onChange={(e) =>
                            setCreateTypeFormData({
                              ...createTypeFormData,
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3.5 text-base border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Durée <span className="text-red-500">*</span>
                          </label>
                          <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setDurationUnit("months");
                                if (durationUnit === "days") {
                                  setDurationMonths(Math.round(createTypeFormData.time / 30) || 1);
                                }
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                durationUnit === "months"
                                  ? "bg-blue-600 text-white shadow"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              Mois
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDurationUnit("days");
                                if (durationUnit === "months") {
                                  setCreateTypeFormData({
                                    ...createTypeFormData,
                                    time: durationMonths * 30,
                                  });
                                }
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                durationUnit === "days"
                                  ? "bg-blue-600 text-white shadow"
                                  : "text-gray-600 hover:bg-gray-100"
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
                              className="w-full px-4 py-3.5 text-base border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none shadow-sm"
                            />
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {durationMonths} mois = {durationMonths * 30} jours
                            </p>
                          </div>
                        ) : (
                          <input
                            type="number"
                            required
                            min="1"
                            value={createTypeFormData.time}
                            onChange={(e) =>
                              setCreateTypeFormData({
                                ...createTypeFormData,
                                time: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full px-4 py-3.5 text-base border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none shadow-sm"
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 space-y-3">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-purple-600" />
                        Sponsors inclus
                      </h4>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Nombre de sponsors / mois
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createTypeFormData.sponsorsPerMonth ?? 0}
                          onChange={(e) =>
                            setCreateTypeFormData({
                              ...createTypeFormData,
                              sponsorsPerMonth: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3.5 text-base border border-purple-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Durée de chaque sponsor (heures)
                          {(createTypeFormData.sponsorsPerMonth ?? 0) > 0 && (
                            <span className="text-red-500"> *</span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required={(createTypeFormData.sponsorsPerMonth ?? 0) > 0}
                          disabled={(createTypeFormData.sponsorsPerMonth ?? 0) === 0}
                          value={createTypeFormData.sponsorDurationHours ?? 48}
                          onChange={(e) =>
                            setCreateTypeFormData({
                              ...createTypeFormData,
                              sponsorDurationHours: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className="w-full px-4 py-3.5 text-base border border-purple-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none shadow-sm disabled:bg-gray-100 disabled:text-gray-400"
                          placeholder="Ex: 48"
                        />
                      </div>
                      <p className="text-xs text-purple-800/80 leading-relaxed">
                        Nombre de sponsors gratuits offerts aux fournisseurs avec cet abonnement. Chaque utilisation
                        déduit 1 du solde restant et dure le nombre d&apos;heures indiqué (ex. 24 = 1 jour, 48 = 2 jours).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview strip */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-blue-900 font-medium">
                    <Tag className="w-4 h-4" />
                    {createTypeFormData.name || "Nom du plan"}
                  </span>
                  <span className="inline-flex items-center gap-2 text-blue-800">
                    <Clock className="w-4 h-4" />
                    {durationUnit === "months"
                      ? `${durationMonths} mois (${durationMonths * 30} j)`
                      : `${createTypeFormData.time} j`}
                  </span>
                  <span className="inline-flex items-center gap-2 text-blue-800">
                    <DollarSign className="w-4 h-4" />
                    {createTypeFormData.price.toLocaleString("fr-FR")} DA
                  </span>
                  <span className="inline-flex items-center gap-2 text-purple-800">
                    <Megaphone className="w-4 h-4" />
                    {createTypeFormData.sponsorsPerMonth ?? 0} sponsor(s)
                    {(createTypeFormData.sponsorsPerMonth ?? 0) > 0 &&
                      ` · ${createTypeFormData.sponsorDurationHours ?? 48} h`}
                  </span>
                </div>
              </div>

              {/* Footer actions */}
              <div className="shrink-0 border-t border-gray-100 bg-gray-50/90 px-6 sm:px-8 py-5 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTypeModal(false);
                    setCreateTypeFormData(emptyCreateTypeForm());
                  }}
                  className="flex-1 px-5 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-semibold text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingType}
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-base shadow-lg shadow-blue-500/25"
                >
                  {isCreatingType ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Créer le type d&apos;abonnement
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
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Description
                </label>
                <textarea
                  value={updateTypeFormData.description || ""}
                  onChange={(e) =>
                    setUpdateTypeFormData({ ...updateTypeFormData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Sponsors disponibles par mois
                </label>
                <input
                  type="number"
                  min="0"
                  value={updateTypeFormData.sponsorsPerMonth ?? 0}
                  onChange={(e) =>
                    setUpdateTypeFormData({
                      ...updateTypeFormData,
                      sponsorsPerMonth: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Durée de chaque sponsor (heures)
                  {(updateTypeFormData.sponsorsPerMonth ?? 0) > 0 && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required={(updateTypeFormData.sponsorsPerMonth ?? 0) > 0}
                  disabled={(updateTypeFormData.sponsorsPerMonth ?? 0) === 0}
                  value={updateTypeFormData.sponsorDurationHours ?? 48}
                  onChange={(e) =>
                    setUpdateTypeFormData({
                      ...updateTypeFormData,
                      sponsorDurationHours: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="Ex: 48"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Durée d&apos;affichage de chaque sponsor inclus (en heures). Ex. 24 = 1 jour, 48 = 2 jours.
                </p>
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
                          const timeValue = getUpdateTimeValue();
                          setUpdateDurationMonths(Math.round(timeValue / 30) || 1);
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
                    value={getUpdateTimeValue()}
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
