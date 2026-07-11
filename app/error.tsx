"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Page indisponible</h2>
        <p style={{ color: "#64748b", marginBottom: 16 }}>
          {error.message || "Une erreur est survenue pendant le chargement."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
