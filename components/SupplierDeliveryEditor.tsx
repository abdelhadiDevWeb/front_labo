"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Truck,
  Search,
  X,
  Check,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  AlertCircle,
  MapPin,
  ChevronDown,
  Eye,
  EyeOff,
  Globe2,
} from "lucide-react";
import { ALGERIA_WILAYAS, getWilayaLabel } from "@/lib/algeria-wilayas";
import {
  Livraison,
  getMyLivraisons,
  createLivraison,
  updateLivraison,
  deleteLivraison,
} from "@/lib/api";

type Props = {
  deliveryNoteAll: string;
  onDeliveryNoteAllChange: (value: string) => void;
};

const MAX_TEXT = 2000;
const SUMMARY_CHIPS = 6;

const byCode = (a: Livraison, b: Livraison) => Number(a.wilayaCode) - Number(b.wilayaCode);
const codeLabel = (code: string) => code.padStart(2, "0");

/**
 * Supplier profile editor: default note for all wilayas (saved with the profile form)
 * + one delivery note per wilaya, saved immediately in the `livraisons` table.
 */
export default function SupplierDeliveryEditor({ deliveryNoteAll, onDeliveryNoteAllChange }: Props) {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const [showList, setShowList] = useState(false);
  const [noteFilter, setNoteFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getMyLivraisons();
      if (cancelled) return;
      if (result.success && result.data) {
        setLivraisons([...result.data.livraisons].sort(byCode));
      } else {
        setError(result.message || "Impossible de charger les notes de livraison");
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const byWilaya = useMemo(
    () => new Map(livraisons.map((l) => [l.wilayaCode, l])),
    [livraisons]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALGERIA_WILAYAS;
    return ALGERIA_WILAYAS.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.includes(q) ||
        w.code.padStart(2, "0").includes(q) ||
        (w.ar_name || "").includes(search.trim())
    );
  }, [search]);

  const visibleNotes = useMemo(() => {
    const q = noteFilter.trim().toLowerCase();
    if (!q) return livraisons;
    return livraisons.filter(
      (l) =>
        l.wilayaName.toLowerCase().includes(q) ||
        l.wilayaCode.includes(q) ||
        codeLabel(l.wilayaCode).includes(q) ||
        l.text.toLowerCase().includes(q)
    );
  }, [livraisons, noteFilter]);

  const selectedExisting = selectedCode ? byWilaya.get(selectedCode) : undefined;

  const selectWilaya = (code: string) => {
    setSelectedCode(code);
    setDraft(byWilaya.get(code)?.text || "");
    setSearch("");
    setError(null);
  };

  const closeSelection = () => {
    setSelectedCode(null);
    setDraft("");
  };

  const closePicker = () => {
    closeSelection();
    setSearch("");
    setShowPicker(false);
  };

  const upsertLocal = (item: Livraison) => {
    setLivraisons((prev) =>
      [...prev.filter((l) => l.id !== item.id), item].sort(byCode)
    );
  };

  const saveSelected = async () => {
    if (!selectedCode || !draft.trim()) return;
    setError(null);
    setBusyId(selectedExisting?.id || "new");
    const result = selectedExisting
      ? await updateLivraison(selectedExisting.id, draft.trim())
      : await createLivraison({ wilayaCode: selectedCode, text: draft.trim() });
    setBusyId(null);
    if (result.success && result.data) {
      upsertLocal(result.data.livraison);
      setSuccess(
        selectedExisting
          ? `Note mise à jour pour ${getWilayaLabel(selectedCode)}.`
          : `Note ajoutée pour ${getWilayaLabel(selectedCode)}.`
      );
      closePicker();
      setShowList(true);
      setNoteFilter("");
      setExpandedId(result.data.livraison.id);
    } else {
      setError(result.message);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (editingId && editingId !== id) setEditingId(null);
  };

  const startEdit = (item: Livraison) => {
    setExpandedId(item.id);
    setEditingId(item.id);
    setEditDraft(item.text);
    setError(null);
  };

  const saveEdit = async (item: Livraison) => {
    if (!editDraft.trim()) return;
    setError(null);
    setBusyId(item.id);
    const result = await updateLivraison(item.id, editDraft.trim());
    setBusyId(null);
    if (result.success && result.data) {
      upsertLocal(result.data.livraison);
      setEditingId(null);
      setSuccess(`Note mise à jour pour ${item.wilayaName}.`);
    } else {
      setError(result.message);
    }
  };

  const remove = async (item: Livraison) => {
    if (!window.confirm(`Supprimer la note de livraison pour ${item.wilayaName} ?`)) return;
    setError(null);
    setBusyId(item.id);
    const result = await deleteLivraison(item.id);
    setBusyId(null);
    if (result.success) {
      setLivraisons((prev) => prev.filter((l) => l.id !== item.id));
      if (editingId === item.id) setEditingId(null);
      if (expandedId === item.id) setExpandedId(null);
      if (selectedCode === item.wilayaCode) closeSelection();
      setSuccess(`Note supprimée pour ${item.wilayaName}.`);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Default note for every wilaya */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-green-50/40 p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <Globe2 className="w-5 h-5 text-green-700" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">Texte pour toutes les wilayas</p>
            <p className="text-xs text-gray-500">
              Affiché par défaut · enregistré avec « Enregistrer les modifications »
            </p>
          </div>
        </div>
        <textarea
          value={deliveryNoteAll}
          onChange={(e) => onDeliveryNoteAllChange(e.target.value)}
          rows={3}
          maxLength={MAX_TEXT}
          placeholder="Ex: Livraison sous 48–72h, frais selon distance…"
          className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {deliveryNoteAll.length} / {MAX_TEXT}
        </p>
      </div>

      {/* Per-wilaya notes */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-sky-700" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                Notes par wilaya
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold bg-sky-600 text-white">
                  {isLoading ? "…" : livraisons.length}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Remplace le texte général pour la wilaya choisie · enregistré immédiatement
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (showPicker ? closePicker() : setShowPicker(true))}
              className={`inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors ${
                showPicker
                  ? "border border-gray-300 text-gray-700 hover:bg-white"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {showPicker ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showPicker ? "Fermer" : "Ajouter une note"}
            </button>
            {livraisons.length > 0 && (
              <button
                type="button"
                onClick={() => setShowList((v) => !v)}
                aria-expanded={showList}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-sky-200 text-sky-700 bg-white hover:bg-sky-50"
              >
                {showList ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showList ? "Masquer" : "Afficher"}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Add: wilaya picker, hidden until requested */}
          {showPicker && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50/40 p-3 sm:p-4">
              {!selectedCode ? (
                <>
                  <p className="text-sm font-semibold text-gray-800 mb-2">1. Choisissez une wilaya</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                      placeholder="Rechercher une wilaya (nom ou code)…"
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm bg-white"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">Aucune wilaya trouvée</p>
                    ) : (
                      filtered.map((w) => {
                        const hasNote = byWilaya.has(w.code);
                        return (
                          <button
                            key={w.code}
                            type="button"
                            onClick={() => selectWilaya(w.code)}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-green-50 transition-colors"
                          >
                            <span className="flex items-center gap-2 font-medium text-gray-800 min-w-0">
                              <span className="inline-flex w-8 justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-600 py-0.5">
                                {codeLabel(w.code)}
                              </span>
                              <span className="truncate">{w.name}</span>
                            </span>
                            {hasNote ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                                <Check className="w-3 h-3" />
                                Renseignée
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 shrink-0">Écrire →</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        2. {selectedExisting ? "Modifier la note" : "Écrivez la note"}
                      </p>
                      <p className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-green-600" />
                        {codeLabel(selectedCode)} — {getWilayaLabel(selectedCode)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSelection}
                      className="text-xs font-medium text-gray-500 hover:text-gray-800 underline underline-offset-2"
                    >
                      Changer de wilaya
                    </button>
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    maxLength={MAX_TEXT}
                    autoFocus
                    placeholder="Délai / frais / conditions pour cette wilaya…"
                    className="w-full px-3 py-2.5 text-sm border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none bg-white"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveSelected()}
                      disabled={!draft.trim() || busyId !== null}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {busyId !== null ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : selectedExisting ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {selectedExisting ? "Mettre à jour" : "Ajouter"}
                    </button>
                    <button
                      type="button"
                      onClick={closePicker}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
                    >
                      Annuler
                    </button>
                    <span className="ml-auto text-xs text-gray-400">
                      {draft.length} / {MAX_TEXT}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Saved notes: summary when hidden, list when shown */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement…
            </div>
          ) : livraisons.length === 0 ? (
            !showPicker && (
              <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 p-4 text-center">
                Aucune note pour le moment. Cliquez sur « Ajouter une note » pour commencer.
              </p>
            )
          ) : !showList ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 mr-1">Wilayas renseignées :</span>
              {livraisons.slice(0, SUMMARY_CHIPS).map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-100"
                >
                  {codeLabel(l.wilayaCode)} — {l.wilayaName}
                </span>
              ))}
              {livraisons.length > SUMMARY_CHIPS && (
                <button
                  type="button"
                  onClick={() => setShowList(true)}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  +{livraisons.length - SUMMARY_CHIPS} autres
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {livraisons.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    value={noteFilter}
                    onChange={(e) => setNoteFilter(e.target.value)}
                    placeholder="Filtrer mes notes…"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                  />
                </div>
              )}
              {visibleNotes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-3">Aucune note ne correspond.</p>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto space-y-2 pr-1">
                  {visibleNotes.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const isEditing = editingId === item.id;
                    const isBusy = busyId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border transition-colors ${
                          isExpanded ? "border-sky-200 bg-sky-50/40" : "border-gray-200 bg-white hover:border-sky-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpanded(item.id)}
                          aria-expanded={isExpanded}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                        >
                          <span className="inline-flex w-9 shrink-0 justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-800 py-1">
                            {codeLabel(item.wilayaCode)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-gray-900 truncate">
                              {item.wilayaName}
                            </span>
                            {!isExpanded && (
                              <span className="block text-xs text-gray-500 truncate">{item.text}</span>
                            )}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  rows={3}
                                  maxLength={MAX_TEXT}
                                  autoFocus
                                  className="w-full px-3 py-2 text-sm border-2 border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none bg-white"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void saveEdit(item)}
                                    disabled={!editDraft.trim() || isBusy}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                                  >
                                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Enregistrer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
                                  >
                                    Annuler
                                  </button>
                                  <span className="ml-auto text-xs text-gray-400">
                                    {editDraft.length} / {MAX_TEXT}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words rounded-lg bg-white border border-gray-100 p-3">
                                  {item.text}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(item)}
                                    disabled={isBusy}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-sky-200 text-sky-700 bg-white hover:bg-sky-50 disabled:opacity-50"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void remove(item)}
                                    disabled={isBusy}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Supprimer
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
