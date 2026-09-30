"use client";

import { useState } from "react";
import {
  Clock,
  CreditCard,
  FileText,
  HandCoins,
  Landmark,
  Loader2,
  Send,
  Upload,
  X,
} from "lucide-react";
import {
  CCP_PAYMENT_INFO,
  RECEIPT_ACCEPT,
  validateReceiptFile,
} from "@/lib/subscription-payment-info";

interface PaymentMethodPickerProps {
  isProcessing: boolean;
  onHandToHand: () => void;
  onCcpSubmit: (receipt: File) => void;
}

const ccpRows = [
  { label: "Titulaire", value: CCP_PAYMENT_INFO.accountHolder },
  { label: "N° CCP", value: CCP_PAYMENT_INFO.ccpNumber },
  { label: "Clé", value: CCP_PAYMENT_INFO.ccpKey },
  { label: "RIP", value: CCP_PAYMENT_INFO.rip },
].filter((row) => row.value.trim() !== "");

export default function PaymentMethodPicker({
  isProcessing,
  onHandToHand,
  onCcpSubmit,
}: PaymentMethodPickerProps) {
  const [ccpOpen, setCcpOpen] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = validateReceiptFile(file);
    if (problem) {
      setReceipt(null);
      setReceiptError(problem);
      return;
    }
    setReceipt(file);
    setReceiptError(null);
  };

  return (
    <div className="space-y-4">
      {/* CCP / BaridiMob receipt */}
      <div
        className={`rounded-2xl border-2 transition-all ${
          ccpOpen ? "border-emerald-400 bg-emerald-50/40" : "border-gray-200 bg-white"
        }`}
      >
        <button
          type="button"
          onClick={() => setCcpOpen((open) => !open)}
          disabled={isProcessing}
          className="w-full flex items-center gap-4 p-5 text-left disabled:opacity-60"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Landmark className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">Reçu CCP / BaridiMob</p>
            <p className="text-sm text-gray-500">
              Payez par CCP ou BaridiMob puis envoyez la photo ou le PDF du reçu.
            </p>
          </div>
        </button>

        {ccpOpen && (
          <div className="px-5 pb-5 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">Coordonnées de paiement</p>
              {ccpRows.length > 0 ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {ccpRows.map((row) => (
                    <div key={row.label} className="contents">
                      <dt className="text-gray-500">{row.label}</dt>
                      <dd className="font-mono font-semibold text-gray-900 break-all">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">
                  Les coordonnées CCP vous seront communiquées par l&apos;administrateur.
                </p>
              )}
            </div>

            {receipt ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-white px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{receipt.name}</p>
                    <p className="text-xs text-gray-500">{(receipt.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  disabled={isProcessing}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Retirer le reçu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer bg-white hover:bg-emerald-50 transition-colors">
                <Upload className="w-7 h-7 text-emerald-600 mb-2" />
                <span className="text-sm font-semibold text-gray-700">Joindre le reçu</span>
                <span className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP ou PDF — max 10 Mo</span>
                <input
                  type="file"
                  accept={RECEIPT_ACCEPT}
                  onChange={handleReceiptChange}
                  className="hidden"
                />
              </label>
            )}

            {receiptError && <p className="text-sm text-red-600">{receiptError}</p>}

            <button
              type="button"
              onClick={() => receipt && onCcpSubmit(receipt)}
              disabled={!receipt || isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Envoyer le reçu
            </button>
          </div>
        )}
      </div>

      {/* Online payment — coming soon */}
      <div
        aria-disabled="true"
        className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-5 opacity-90 cursor-not-allowed select-none"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-slate-200/40 blur-2xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold text-slate-700">Paiement en ligne (Chargily)</p>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                <Clock className="h-3 w-3" />
                Coming soon
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Le paiement en ligne arrive bientôt. Utilisez pour l&apos;instant le reçu CCP /
              BaridiMob ou le paiement en main propre.
            </p>
          </div>
        </div>
      </div>

      {/* Hand to hand */}
      <button
        type="button"
        onClick={onHandToHand}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-md shadow-blue-600/20"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <HandCoins className="w-5 h-5" />}
        Paiement en main propre
      </button>
    </div>
  );
}
