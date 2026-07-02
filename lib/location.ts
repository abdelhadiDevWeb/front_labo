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

  return {
    wilaya: find(["administrative_area_level_1"]),
    daira: find(["administrative_area_level_2"]),
    commune: find(["locality", "sublocality", "sublocality_level_1", "administrative_area_level_3"]),
  };
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

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
}

export function getMapProvider(): "google" | "osm" {
  const provider = process.env.NEXT_PUBLIC_WORKSHOP_MAP_PROVIDER?.trim().toLowerCase();
  return provider === "google" ? "google" : "osm";
}
