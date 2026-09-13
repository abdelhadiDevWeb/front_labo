"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { MapPin, Loader2 } from "lucide-react";
import {
  type LocationData,
  parseAddressComponents,
  getGoogleMapsApiKey,
  getMapProvider,
  enrichAlgeriaLocation,
} from "@/lib/location";
import { resolveWilayaFromCoordinates } from "@/lib/algeria-wilayas";

const libraries: ("places")[] = ["places"];

/** Shared loader id so client + supplier sections don't re-init Google Maps scripts */
const GOOGLE_MAPS_LOADER_ID = "marketlab-google-maps";

const mapContainerStyle = {
  width: "100%",
  height: "280px",
  borderRadius: "0.75rem",
};

const defaultCenter = { lat: 36.7538, lng: 3.0588 };

interface LocationPickerProps {
  value: LocationData | null;
  onChange: (location: LocationData) => void;
  inputId?: string;
  label?: string;
  required?: boolean;
}

function buildLocationFromGeocoder(
  result: google.maps.GeocoderResult,
  lat: number,
  lng: number
): LocationData {
  const parsed = parseAddressComponents(result.address_components);
  return enrichAlgeriaLocation(
    {
      address: result.formatted_address,
      latitude: lat,
      longitude: lng,
      wilaya: parsed.wilaya,
      daira: parsed.daira,
      commune: parsed.commune,
      placeId: result.place_id,
    },
    resolveWilayaFromCoordinates
  );
}

function GoogleLocationPicker({
  value,
  onChange,
  inputId = "location-search",
  label = "Localisation",
  required = true,
}: LocationPickerProps) {
  const apiKey = getGoogleMapsApiKey();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [mapCenter, setMapCenter] = useState(
    value?.latitude && value?.longitude
      ? { lat: value.latitude, lng: value.longitude }
      : defaultCenter
  );
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
    value?.latitude && value?.longitude
      ? { lat: value.latitude, lng: value.longitude }
      : null
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries,
    language: "fr",
    region: "DZ",
  });

  useEffect(() => {
    if (isLoaded && !geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, [isLoaded]);

  const applyGeocodeResult = useCallback(
    (result: google.maps.GeocoderResult, lat: number, lng: number) => {
      const location = buildLocationFromGeocoder(result, lat, lng);
      setMapCenter({ lat, lng });
      setMarkerPos({ lat, lng });
      if (inputRef.current) {
        inputRef.current.value = location.address;
      }
      onChange(location);
    },
    [onChange]
  );

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!geocoderRef.current) return;
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          applyGeocodeResult(results[0], lat, lng);
        }
      });
    },
    [applyGeocodeResult]
  );

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    if (place.address_components && place.formatted_address) {
      const parsed = parseAddressComponents(place.address_components);
      const location = enrichAlgeriaLocation(
        {
          address: place.formatted_address,
          latitude: lat,
          longitude: lng,
          wilaya: parsed.wilaya,
          daira: parsed.daira,
          commune: parsed.commune,
          placeId: place.place_id,
        },
        resolveWilayaFromCoordinates
      );
      onChange(location);
      if (inputRef.current) {
        inputRef.current.value = place.formatted_address;
      }
      setMapCenter({ lat, lng });
      setMarkerPos({ lat, lng });
    } else {
      reverseGeocode(lat, lng);
    }
  }, [onChange, reverseGeocode]);

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Clé Google Maps manquante. Ajoutez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY dans .env.local
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Impossible de charger Google Maps. Vérifiez la clé API et la facturation GCP.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-10 text-sm text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de la carte...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <Autocomplete
          onLoad={(ac) => {
            autocompleteRef.current = ac;
            ac.setComponentRestrictions({ country: "dz" });
            ac.setFields(["address_components", "formatted_address", "geometry", "place_id"]);
          }}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            defaultValue={value?.address || ""}
            placeholder="Rechercher une adresse en Algérie..."
            className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </Autocomplete>
      </div>

      <p className="text-xs text-gray-500">
        Recherchez une adresse ou cliquez sur la carte pour placer le marqueur.
      </p>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={markerPos ? 14 : 6}
        onClick={onMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {markerPos && <Marker position={markerPos} />}
      </GoogleMap>

      {value && value.latitude !== 0 && (
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs sm:grid-cols-3">
          <div>
            <span className="font-semibold text-gray-700">Wilaya:</span>{" "}
            <span className="text-gray-900">{value.wilaya || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Daira:</span>{" "}
            <span className="text-gray-900">{value.daira || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Commune:</span>{" "}
            <span className="text-gray-900">{value.commune || "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationPicker(props: LocationPickerProps) {
  const provider = getMapProvider();

  if (provider !== "google") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Le fournisseur de carte &quot;{provider}&quot; n&apos;est pas encore configuré. Définissez{" "}
        <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_WORKSHOP_MAP_PROVIDER=google</code>{" "}
        dans .env.local.
      </div>
    );
  }

  return <GoogleLocationPicker {...props} />;
}
