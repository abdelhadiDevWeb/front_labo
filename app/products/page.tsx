"use client";

import dynamic from "next/dynamic";

const ProductsClient = dynamic(() => import("./ProductsClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        color: "#1e3a8a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Chargement...
    </div>
  ),
});

export default function ProductsPage() {
  return <ProductsClient />;
}
