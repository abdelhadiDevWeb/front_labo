"use client";

import { useCallback, useEffect, useState } from "react";
import { checkAuthSession, getProfile } from "@/lib/api";
import { GeoPoint, reverseGeocodeWilaya } from "@/lib/product-proximity";

export type LocationStatus = "loading" | "granted" | "denied" | "prompt";

const LOCATION_RESOLVE_TIMEOUT_MS = 12_000;
const AUTH_CHECK_TIMEOUT_MS = 8_000;
const REVERSE_GEOCODE_TIMEOUT_MS = 8_000;

const withTimeout = async <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export function useUserLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [source, setSource] = useState<"profile" | "browser" | null>(null);

  const applyBrowserPosition = useCallback(async (latitude: number, longitude: number) => {
    setLocation({ latitude, longitude });
    setSource("browser");
    setStatus("granted");

    try {
      const wilaya = await withTimeout(
        reverseGeocodeWilaya(latitude, longitude),
        REVERSE_GEOCODE_TIMEOUT_MS,
        ""
      );
      if (wilaya) {
        setLocation({ latitude, longitude, wilaya });
      }
    } catch {
      // Keep coordinates even if reverse geocoding fails.
    }
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
      const authenticated = await withTimeout(checkAuthSession(), AUTH_CHECK_TIMEOUT_MS, false);
      if (authenticated) {
        try {
          const profile = await withTimeout(getProfile(), AUTH_CHECK_TIMEOUT_MS, {
            success: false,
            message: "timeout",
          });
          if (
            !cancelled &&
            profile.success &&
            profile.data &&
            profile.data.latitude != null &&
            profile.data.longitude != null &&
            profile.data.latitude !== 0 &&
            profile.data.longitude !== 0
          ) {
            setLocation({
              latitude: profile.data.latitude,
              longitude: profile.data.longitude,
              wilaya: profile.data.wilaya || undefined,
            });
            setSource("profile");
            setStatus("granted");
            return;
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus((current) => (current === "loading" ? "prompt" : current));
    }, LOCATION_RESOLVE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, []);

  return { location, status, source, requestBrowserLocation };
}
