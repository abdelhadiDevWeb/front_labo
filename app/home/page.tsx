"use client";

import dynamic from "next/dynamic";

/**
 * Client-only shell — Next.js 16 requires ssr:false inside a Client Component.
 * Avoids shipping a huge incomplete Flight/SSR payload that throws "Connection closed"
 * and blocks hydration (so browser API calls never start).
 */
const HomeClient = dynamic(() => import("./HomeClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #eff6ff, #ffffff, #ecfeff)",
        color: "#1e3a8a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Chargement...
    </div>
  ),
});

export default function HomePage() {
  return <HomeClient />;
}
