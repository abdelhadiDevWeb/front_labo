"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Loader2,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  getAllSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  Sponsor,
  CreateSponsorData,
  UpdateSponsorData,
} from "@/lib/api";

export default function SponsorsPage() {
  const router = useRouter();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [createForm, setCreateForm] = useState<CreateSponsorData>({ time: 30, price: 0 });
  const [updateForm, setUpdateForm] = useState<UpdateSponsorData>({ time: 30, price: 0 });

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "sou-admin") {
          router.replace("/dashboard");
        }
      } catch {
        // ignore
      }
    }
    loadSponsors();
  }, [router]);

  const loadSponsors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllSponsors();
      if (result.success && result.data) {
        setSponsors(result.data.sponsors);
      } else {
        setError(result.message || "Erreur lors du chargement des sponsors");
      }
    } catch {
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSponsors = sponsors.filter((sponsor) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      sponsor.id.toLowerCase().includes(query) ||
      sponsor.time.toString().includes(query) ||
      sponsor.price.toString().includes(query)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createSponsor({
        time: Number(createForm.time),
        price: Number(createForm.price),
      });

      if (result.success) {
        setSuccess("Sponsor créé avec succès");
        setShowCreateModal(false);
        setCreateForm({ time: 30, price: 0 });
        await loadSponsors();
      } else {
        setError(result.message || "Erreur lors de la création");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUpdate = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setUpdateForm({ time: sponsor.time, price: sponsor.price });
    setShowUpdateModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSponsor) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateSponsor(selectedSponsor.id, {
        time: Number(updateForm.time),
        price: Number(updateForm.price),
      });

      if (result.success) {
        setSuccess("Sponsor mis à jour avec succès");
        setShowUpdateModal(false);
        setSelectedSponsor(null);
        await loadSponsors();
      } else {
        setError(result.message || "Erreur lors de la mise à jour");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sponsorId: string) => {
    if (!confirm("Supprimer ce sponsor ?")) return;

    setDeletingId(sponsorId);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteSponsor(sponsorId);
      if (result.success) {
        setSuccess("Sponsor supprimé avec succès");
        await loadSponsors();
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (days: number) => `${days} ${days === 1 ? "jour" : "jours"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-blue-600" />
            Gestion des Sponsors
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Créer et gérer les packs sponsor (durée en jours et prix)
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreateForm({ time: 30, price: 0 });
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau sponsor
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-800">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par ID, durée ou prix..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredSponsors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="py-3 px-4 font-semibold">ID</th>
                  <th className="py-3 px-4 font-semibold">Durée</th>
                  <th className="py-3 px-4 font-semibold">Prix</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSponsors.map((sponsor) => (
                  <tr key={sponsor.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <span className="text-xs font-mono text-gray-600 break-all">{sponsor.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-gray-900">
                        <Clock className="w-4 h-4 text-blue-600" />
                        {formatDuration(sponsor.time)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        {sponsor.price.toLocaleString("fr-FR")} DA
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenUpdate(sponsor)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(sponsor.id)}
                          disabled={deletingId === sponsor.id}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                        >
                          {deletingId === sponsor.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery ? "Aucun sponsor trouvé" : "Aucun sponsor disponible"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setCreateForm({ time: 30, price: 0 });
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Créer le premier sponsor
              </button>
            )}
          </div>
        )}
      </div>

      {mounted &&
        showCreateModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Nouveau sponsor</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Durée (jours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={createForm.time}
                    onChange={(e) => setCreateForm({ ...createForm, time: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prix (DA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={createForm.price}
                    onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        showUpdateModal &&
        selectedSponsor &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Modifier le sponsor</h3>
                </div>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedSponsor(null);
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
                  <p className="text-xs font-mono text-gray-700 break-all bg-gray-50 p-3 rounded-lg">
                    {selectedSponsor.id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Durée (jours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={updateForm.time}
                    onChange={(e) => setUpdateForm({ ...updateForm, time: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prix (DA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={updateForm.price}
                    onChange={(e) => setUpdateForm({ ...updateForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateModal(false);
                      setSelectedSponsor(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Enregistrer
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
