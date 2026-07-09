"use client";

import { useCallback, useEffect, useState } from "react";
import { checkAuthSession, getProfile } from "@/lib/api";
import { GeoPoint, reverseGeocodeWilaya } from "@/lib/product-proximity";

export type LocationStatus = "loading" | "granted" | "denied" | "prompt";

export function useUserLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [source, setSource] = useState<"profile" | "browser" | null>(null);

  const applyBrowserPosition = useCallback(async (latitude: number, longitude: number) => {
    const wilaya = await reverseGeocodeWilaya(latitude, longitude);
    setLocation({ latitude, longitude, wilaya: wilaya || undefined });
    setSource("browser");
    setStatus("granted");
  }, []);

  const requestBrowserLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyBrowserPosition(position.coords.latitude, position.coords.longitude);
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, [applyBrowserPosition]);

  useEffect(() => {
    let cancelled = false;

    const requestBrowserLocation = () => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        if (!cancelled) setStatus("prompt");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) {
            void applyBrowserPosition(position.coords.latitude, position.coords.longitude);
          }
        },
        () => {
          if (!cancelled) {
            setStatus((prev) => (prev === "granted" ? prev : "prompt"));
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
      );
    };

    // Visitors: browser geolocation immediately — do not wait on auth API calls.
    requestBrowserLocation();

    const resolveProfileLocation = async () => {
      try {
        const authenticated = await checkAuthSession();
        if (!authenticated || cancelled) return;

        const profile = await getProfile();
        if (
          cancelled ||
          !profile.success ||
          !profile.data ||
          profile.data.latitude == null ||
          profile.data.longitude == null ||
          profile.data.latitude === 0 ||
          profile.data.longitude === 0
        ) {
          return;
        }

        setLocation({
          latitude: profile.data.latitude,
          longitude: profile.data.longitude,
          wilaya: profile.data.wilaya || undefined,
        });
        setSource("profile");
        setStatus("granted");
      } catch {
        // Keep browser location if profile lookup fails.
      }
    };

    void resolveProfileLocation();

    return () => {
      cancelled = true;
    };
  }, [applyBrowserPosition]);

  return { location, status, source, requestBrowserLocation };
}
