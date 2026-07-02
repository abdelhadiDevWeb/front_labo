import { PublicProduct } from "@/lib/api";
import { getGoogleMapsApiKey } from "@/lib/location";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  wilaya?: string;
}

const geocodeCache = new Map<string, GeoPoint>();

export function normalizeWilaya(value?: string | null): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bwilaya\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const cacheKey = query.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      `${query}, Algeria`
    )}&key=${apiKey}&language=fr`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    const components = data.results[0].address_components || [];
    const wilaya =
      components.find((c: { types: string[] }) =>
        c.types.includes("administrative_area_level_1")
      )?.long_name || "";

    const point: GeoPoint = { latitude: lat, longitude: lng, wilaya };
    geocodeCache.set(cacheKey, point);
    return point;
  } catch {
    return null;
  }
}

export async function reverseGeocodeWilaya(latitude: number, longitude: number): Promise<string> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return "";

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=fr`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== "OK" || !data.results?.[0]) return "";

    const components = data.results[0].address_components || [];
    return (
      components.find((c: { types: string[] }) =>
        c.types.includes("administrative_area_level_1")
      )?.long_name || ""
    );
  } catch {
    return "";
  }
}

async function resolveProductCoords(product: PublicProduct): Promise<GeoPoint | null> {
  if (product.latitude != null && product.longitude != null) {
    return {
      latitude: product.latitude,
      longitude: product.longitude,
      wilaya: product.wilaya || undefined,
    };
  }

  const label = product.commune
    ? `${product.commune}, ${product.wilaya || ""}`
    : product.wilaya || "";
  if (!label.trim()) return null;

  return geocodeAddress(label);
}

export async function sortProductsByProximity(
  products: PublicProduct[],
  userLocation: GeoPoint
): Promise<PublicProduct[]> {
  if (!userLocation.latitude || !userLocation.longitude) {
    return products;
  }

  const userWilaya = normalizeWilaya(userLocation.wilaya);

  const ranked = await Promise.all(
    products.map(async (product) => {
      const coords = await resolveProductCoords(product);
      const productWilaya = normalizeWilaya(product.wilaya);
      const sameWilaya = !!userWilaya && !!productWilaya && userWilaya === productWilaya;

      let distanceKm = Number.POSITIVE_INFINITY;
      if (coords) {
        distanceKm = haversineKm(
          userLocation.latitude,
          userLocation.longitude,
          coords.latitude,
          coords.longitude
        );
      }

      return { product, sameWilaya, distanceKm };
    })
  );

  ranked.sort((a, b) => {
    if (a.sameWilaya !== b.sameWilaya) {
      return a.sameWilaya ? -1 : 1;
    }
    return a.distanceKm - b.distanceKm;
  });

  return ranked.map((item) => item.product);
}
