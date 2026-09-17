"use client";

import Image from "next/image";

const BRAND_NAME = "Dz Labmarket";

type AppLoadingScreenProps = {
  /** Kept for API compatibility — always shows the same single message. */
  message?: string;
  fullScreen?: boolean;
};

/**
 * Single loading UI for the whole app (route + session).
 * Do not invent alternate spinners on public pages — reuse this.
 */
export default function AppLoadingScreen({
  fullScreen = true,
}: AppLoadingScreenProps) {
  const shell = (
    <div className="flex flex-col items-center justify-center gap-5 px-4">
      <Image
        src="/pi/logo-dz-labomarket.png"
        alt={`${BRAND_NAME} Logo`}
        width={200}
        height={80}
        className="h-16 w-auto rounded-xl object-contain sm:h-20"
        priority
      />
      <div
        className="h-11 w-11 rounded-full border-4 border-blue-100 border-t-blue-600"
        style={{ animation: "app-loading-spin 0.8s linear infinite" }}
        aria-hidden
      />
      <p className="text-sm font-medium text-slate-600">Chargement…</p>
      <style>{`@keyframes app-loading-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!fullScreen) return shell;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f3f6fb]"
      role="status"
      aria-live="polite"
      aria-label="Chargement"
    >
      {shell}
    </div>
  );
}
