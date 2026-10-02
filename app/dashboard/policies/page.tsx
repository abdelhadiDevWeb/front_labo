"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ScrollText,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  FlaskConical,
  Truck,
} from "lucide-react";
import {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getSessionRole,
  Policy,
  PolicyFormData,
  PolicyType,
} from "@/lib/api";

const SECTIONS: {
  type: PolicyType;
  title: string;
  description: string;
  icon: typeof FlaskConical;
  accent: string;
}[] = [
  {
    type: "labo",
    title: "Laboratoires",
    description: "Conditions affichées lors de l'inscription d'un laboratoire",
    icon: FlaskConical,
    accent: "text-cyan-600 bg-cyan-50",
  },
  {
    type: "supplier",
    title: "Fournisseurs",
    description: "Conditions affichées lors de l'inscription d'un fournisseur",
    icon: Truck,
    accent: "text-blue-600 bg-blue-50",
  },
];

const TYPE_LABELS: Record<PolicyType, string> = {
  labo: "Laboratoire",
  supplier: "Fournisseur",
};

const emptyForm = (type: PolicyType): PolicyFormData => ({ type, title: "", text: "" });

export default function PoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState<PolicyFormData>(emptyForm("labo"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllPolicies();
      if (result.success && result.data) {
        setPolicies(result.data.policies);
      } else {
        setError(result.message || "Erreur lors du chargement des politiques");
      }
    } catch {
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const checkRole = async () => {
      const session = await getSessionRole();
      if (session?.role === "sou-admin") {
        router.replace("/dashboard");
      }
    };
    void checkRole();
    void loadPolicies();
  }, [router, loadPolicies]);

  const openCreate = (type: PolicyType) => {
    setEditingPolicy(null);
    setForm(emptyForm(type));
    setShowModal(true);
  };

  const openEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setForm({ type: policy.type, title: policy.title, text: policy.text });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPolicy(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: PolicyFormData = {
      type: form.type,
      title: form.title.trim(),
      text: form.text.trim(),
    };
    if (!payload.title || !payload.text) {
      setError("Le titre et le texte sont obligatoires");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = editingPolicy
        ? await updatePolicy(editingPolicy.id, payload)
        : await createPolicy(payload);

      if (result.success) {
        setSuccess(editingPolicy ? "Politique mise à jour avec succès" : "Politique créée avec succès");
        closeModal();
        await loadPolicies();
      } else {
        setError(result.message || "Erreur lors de l'enregistrement");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`Supprimer la politique « ${policy.title} » ?`)) return;

    setDeletingId(policy.id);
    setError(null);
    setSuccess(null);
    try {
      const result = await deletePolicy(policy.id);
      if (result.success) {
        setSuccess("Politique supprimée avec succès");
        await loadPolicies();
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ScrollText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" />
          Politiques &amp; conditions générales
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Les politiques sont affichées à l&apos;utilisateur lors de son inscription, selon son type de compte.
        </p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const sectionPolicies = policies.filter((p) => p.type === section.type);
          return (
            <section
              key={section.type}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 flex flex-col min-w-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${section.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">
                      {section.title}{" "}
                      <span className="text-sm font-medium text-gray-400">({sectionPolicies.length})</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => openCreate(section.type)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : sectionPolicies.length > 0 ? (
                <ul className="space-y-3">
                  {sectionPolicies.map((policy) => (
                    <li key={policy.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-gray-900 break-words min-w-0">{policy.title}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(policy)}
                            title="Modifier"
                            aria-label="Modifier"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(policy)}
                            disabled={deletingId === policy.id}
                            title="Supprimer"
                            aria-label="Supprimer"
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === policy.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 whitespace-pre-line break-words line-clamp-4">
                        {policy.text}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10 flex-1 flex flex-col items-center justify-center">
                  <ScrollText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">Aucune politique pour les {section.title.toLowerCase()}</p>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {mounted &&
        showModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 sm:p-6 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {editingPolicy ? <Edit className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {editingPolicy ? "Modifier la politique" : "Nouvelle politique"}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  aria-label="Fermer"
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div>
                  <label htmlFor="policy-type" className="block text-sm font-semibold text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="policy-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PolicyType })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-base sm:text-sm"
                  >
                    {SECTIONS.map((s) => (
                      <option key={s.type} value={s.type}>
                        {TYPE_LABELS[s.type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="policy-title" className="block text-sm font-semibold text-gray-700 mb-2">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="policy-title"
                    type="text"
                    required
                    maxLength={200}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex : Conditions d'utilisation"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="policy-text" className="block text-sm font-semibold text-gray-700 mb-2">
                    Texte <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="policy-text"
                    required
                    maxLength={20000}
                    rows={10}
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    placeholder="Rédigez le contenu de la politique..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-base sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">{form.text.length} / 20000</p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
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
                    {editingPolicy ? "Enregistrer" : "Créer"}
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
