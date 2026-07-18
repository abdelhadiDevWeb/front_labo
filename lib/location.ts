export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  wilaya: string;
  daira: string;
  commune: string;
  placeId?: string;
}

export const EMPTY_LOCATION: LocationData = {
  address: "",
  latitude: 0,
  longitude: 0,
  wilaya: "",
  daira: "",
  commune: "",
};

export function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): Pick<LocationData, "wilaya" | "daira" | "commune"> {
  const find = (types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name || "";

  // Algeria Google results often omit locality; fall back through admin levels.
  const wilaya =
    find(["administrative_area_level_1"]) ||
    find(["administrative_area_level_2"]);
  const daira =
    find(["administrative_area_level_2"]) ||
    find(["administrative_area_level_3"]);
  const commune =
    find(["locality", "sublocality", "sublocality_level_1", "administrative_area_level_3"]) ||
    find(["administrative_area_level_2"]) ||
    wilaya;

  return { wilaya, daira, commune };
}

export function isLocationComplete(location: LocationData | null): boolean {
  if (!location) return false;
  return (
    location.address.trim().length >= 5 &&
    location.latitude !== 0 &&
    location.longitude !== 0 &&
    location.wilaya.trim().length > 0 &&
    location.commune.trim().length > 0
  );
}

/**
 * Fill missing wilaya/commune from nearest Algerian wilaya when Google
 * returns incomplete address components (common on map-click).
 */
export function enrichAlgeriaLocation(
  location: LocationData,
  resolveNearest: (lat: number, lng: number) => { name: string } | null
): LocationData {
  if (location.wilaya.trim() && location.commune.trim()) {
    return location;
  }
  const nearest = resolveNearest(location.latitude, location.longitude);
  if (!nearest) return location;
  return {
    ...location,
    wilaya: location.wilaya.trim() || nearest.name,
    commune: location.commune.trim() || location.wilaya.trim() || nearest.name,
  };
}

import { getValidatedGoogleMapsApiKey } from "./security";

export function getGoogleMapsApiKey(): string {
  return getValidatedGoogleMapsApiKey() || "";
}

export function getMapProvider(): "google" | "osm" {
  const provider = process.env.NEXT_PUBLIC_WORKSHOP_MAP_PROVIDER?.trim().toLowerCase();
  if (provider === "osm") return "osm";
  // Default to Google when a Maps API key is present (register page depends on it)
  if (getGoogleMapsApiKey()) return "google";
  return provider === "google" ? "google" : "osm";
}
