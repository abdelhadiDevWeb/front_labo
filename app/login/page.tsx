"use client";

import dynamic from "next/dynamic";

const LoginClient = dynamic(() => import("./LoginClient"), {
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

export default function LoginPage() {
  return <LoginClient />;
}
