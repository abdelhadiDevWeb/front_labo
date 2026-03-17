"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Shield, Search, Plus, Eye, Mail, Phone, MapPin, User, X, CheckCircle, XCircle, Loader2, Key } from "lucide-react";
import { getAllAdmins, createAdmin, updateAdminStatus, AdminData, CreateAdminData } from "@/lib/api";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState<CreateAdminData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [searchQuery]);

  const loadAdmins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllAdmins({
        search: searchQuery || undefined,
        limit: 100,
      });
      if (result.success && result.data) {
        setAdmins(result.data.admins);
      } else {
        setError(result.message || "Erreur lors du chargement des admins");
      }
    } catch (err) {
      console.error("Load admins error:", err);
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createAdmin(formData);
      if (result.success && result.data) {
        setSuccess("Admin créé avec succès!");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          phone: "",
          address: "",
        });
        setShowCreateModal(false);
        await loadAdmins();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la création de l'admin");
        if (result.errors) {
          setError(result.errors.join(", "));
        }
      }
    } catch (err) {
      console.error("Create admin error:", err);
      setError("Une erreur est survenue lors de la création");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    setIsUpdatingStatus(adminId);
    setError(null);
    try {
      const result = await updateAdminStatus(adminId, !currentStatus);
      if (result.success) {
        await loadAdmins();
        setSuccess(`Statut de l'admin mis à jour avec succès`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la mise à jour du statut");
      }
    } catch (err) {
      console.error("Update status error:", err);
      setError("Une erreur est survenue lors de la mise à jour");
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleViewDetails = (admin: AdminData) => {
    setSelectedAdmin(admin);
    setShowDetailModal(true);
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Admins</h2>
          <p className="text-gray-500 mt-1">Gérez les administrateurs et leurs statuts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvel Admin</span>
        </button>
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

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        /* Admins Grid */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAdmins.map((admin) => (
          <div
              key={admin._id}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {admin.firstName} {admin.lastName}
                    </h3>
                  <p className="text-sm text-gray-500">{admin.email}</p>
                </div>
              </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      admin.status
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {admin.status ? "Actif" : "Inactif"}
              </span>
                </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                {admin.phone}
              </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {admin.address}
                </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Key className="w-4 h-4 text-gray-400" />
                  Créé le: {new Date(admin.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleViewDetails(admin)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
              </button>
                <button
                  onClick={() => handleToggleStatus(admin._id, admin.status)}
                  disabled={isUpdatingStatus === admin._id}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    admin.status
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-green-100 text-green-600 hover:bg-green-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isUpdatingStatus === admin._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : admin.status ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Désactiver</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Activer</span>
                    </>
                  )}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {!isLoading && filteredAdmins.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Aucun administrateur trouvé</p>
        </div>
      )}

      {/* Create Admin Modal */}
      {mounted && showCreateModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">Créer un nouvel Admin</h3>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5">Ajoutez un nouvel administrateur au système</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleCreateAdmin} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* First Name */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Entrez le prénom"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Entrez le nom"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="exemple@email.com"
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 8 caractères"
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Adresse <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 sm:left-4 top-3 sm:top-4 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    placeholder="Entrez l'adresse complète"
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Note:</strong> Le statut de l'admin sera défini sur <strong>Inactif</strong> par défaut. Vous pourrez l'activer après la création.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      Créer l'Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Admin Details Modal */}
      {mounted && showDetailModal && selectedAdmin && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Détails de l'Admin</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 sm:p-2 flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-200">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl flex-shrink-0">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 break-words">
                    {selectedAdmin.firstName} {selectedAdmin.lastName}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-500 break-words">{selectedAdmin.email}</p>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 break-words">{selectedAdmin.email}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 break-words">{selectedAdmin.phone}</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 break-words">{selectedAdmin.address}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700">Rôle: {selectedAdmin.role}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {selectedAdmin.status ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm text-gray-700">
                    Statut: {selectedAdmin.status ? "Actif" : "Inactif"}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Key className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700">
                    Créé le: {new Date(selectedAdmin.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleToggleStatus(selectedAdmin._id, selectedAdmin.status)}
                  disabled={isUpdatingStatus === selectedAdmin._id}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base ${
                    selectedAdmin.status
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-green-100 text-green-600 hover:bg-green-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isUpdatingStatus === selectedAdmin._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : selectedAdmin.status ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Désactiver</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Activer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
