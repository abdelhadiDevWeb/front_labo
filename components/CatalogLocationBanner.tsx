"use client";

import { MapPin, Navigation, Loader2 } from "lucide-react";

type Props = {
  isGuest: boolean;
  locationStatus: "loading" | "granted" | "denied" | "prompt";
  wilayaLabel?: string | null;
  source?: "profile" | "browser" | null;
  onRequestLocation: () => void;
  catalogLabel?: string;
};

export default function CatalogLocationBanner({
  isGuest,
  locationStatus,
  wilayaLabel,
  source,
  onRequestLocation,
  catalogLabel = "articles",
}: Props) {
  if (locationStatus === "loading") {
    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-sm text-blue-800">
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        Détection de votre wilaya...
      </div>
    );
  }

  if (locationStatus === "granted" && wilayaLabel) {
    return (
      <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-800">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span>
          {catalogLabel} pour votre wilaya : <strong>{wilayaLabel}</strong>
          {source === "profile" ? " · depuis votre profil" : " · depuis votre position"}
        </span>
      </div>
    );
  }

  if (locationStatus === "prompt" || locationStatus === "denied") {
    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Navigation className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isGuest ? "Autorisez votre localisation" : "Localisation requise"}
            </p>
            <p className="text-sm text-gray-600">
              {isGuest
                ? `Pour afficher les ${catalogLabel} disponibles dans votre wilaya, autorisez l'accès à votre position.`
                : `Complétez la wilaya de votre profil labo ou autorisez la géolocalisation pour voir les ${catalogLabel} de votre région.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRequestLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Autoriser la localisation
        </button>
      </div>
    );
  }

  return null;
}
