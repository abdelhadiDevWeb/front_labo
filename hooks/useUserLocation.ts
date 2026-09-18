"use client";

import { useCallback, useEffect, useState } from "react";
import { checkAuthSession, getProfile } from "@/lib/api";
import { GeoPoint, reverseGeocodeWilaya } from "@/lib/product-proximity";

export type LocationStatus = "loading" | "granted" | "denied" | "prompt";

const GEO_OPTIONS_FAST: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12000,
  maximumAge: 600000,
};

const GEO_OPTIONS_ACCURATE: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 300000,
};

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function useUserLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [source, setSource] = useState<"profile" | "browser" | null>(null);

  const applyBrowserPosition = useCallback(async (latitude: number, longitude: number) => {
    const wilaya = await reverseGeocodeWilaya(latitude, longitude);
    if (!wilaya) {
      // Coords obtained but wilaya unresolved — keep waiting for user retry
      setLocation({ latitude, longitude });
      setSource("browser");
      setStatus("prompt");
      return;
    }
    setLocation({ latitude, longitude, wilaya });
    setSource("browser");
    setStatus("granted");
  }, []);

  const requestBrowserLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }

    setStatus("loading");

    void (async () => {
      try {
        // Fast network/cell location first (more reliable on first visit)
        const position = await getCurrentPosition(GEO_OPTIONS_FAST).catch(() =>
          getCurrentPosition(GEO_OPTIONS_ACCURATE)
        );
        await applyBrowserPosition(position.coords.latitude, position.coords.longitude);
      } catch {
        setStatus("denied");
      }
    })();
  }, [applyBrowserPosition]);

  useEffect(() => {
    let cancelled = false;

    const resolveLocation = async () => {
      setStatus("loading");

      const authenticated = await checkAuthSession();
      if (authenticated) {
        try {
          const profile = await getProfile();
          if (!cancelled && profile.success && profile.data) {
            const wilaya = profile.data.wilaya?.trim() || "";
            const lat = profile.data.latitude;
            const lng = profile.data.longitude;
            const hasCoords =
              lat != null &&
              lng != null &&
              Number(lat) !== 0 &&
              Number(lng) !== 0;

            if (wilaya) {
              setLocation({
                latitude: hasCoords ? Number(lat) : 0,
                longitude: hasCoords ? Number(lng) : 0,
                wilaya,
              });
              setSource("profile");
              setStatus("granted");
              return;
            }

            if (hasCoords) {
              const fromCoords = await reverseGeocodeWilaya(Number(lat), Number(lng));
              if (!cancelled && fromCoords) {
                setLocation({
                  latitude: Number(lat),
                  longitude: Number(lng),
                  wilaya: fromCoords,
                });
                setSource("profile");
                setStatus("granted");
                return;
              }
            }
          }
        } catch {
          // fall through to browser
        }
      }

      if (cancelled) return;

      if (typeof window === "undefined" || !navigator.geolocation) {
        setStatus("prompt");
        return;
      }

      // Auto-ask on first visit — stay in loading until we get a result
      try {
        const position = await getCurrentPosition(GEO_OPTIONS_FAST).catch(() =>
          getCurrentPosition(GEO_OPTIONS_ACCURATE)
        );
        if (!cancelled) {
          await applyBrowserPosition(position.coords.latitude, position.coords.longitude);
        }
      } catch {
        if (!cancelled) setStatus("prompt");
      }
    };

    void resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [applyBrowserPosition]);

  return { location, status, source, requestBrowserLocation };
}
