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
    setStatus(wilaya ? "granted" : "prompt");
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

    const resolveLocation = async () => {
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
            // Labo / client profile: wilaya alone is enough to filter catalog
            if (hasCoords || wilaya) {
              setLocation({
                latitude: hasCoords ? Number(lat) : 0,
                longitude: hasCoords ? Number(lng) : 0,
                wilaya: wilaya || undefined,
              });
              setSource("profile");
              setStatus(wilaya || hasCoords ? "granted" : "prompt");
              return;
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

      // Auto-ask visitors for location permission
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) {
            void applyBrowserPosition(position.coords.latitude, position.coords.longitude);
          }
        },
        () => {
          if (!cancelled) setStatus("prompt");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
      );
    };

    void resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [applyBrowserPosition]);

  return { location, status, source, requestBrowserLocation };
}
