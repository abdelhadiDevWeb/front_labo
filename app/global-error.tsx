"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Une erreur est survenue</h1>
          <p style={{ color: "#64748b", marginBottom: 16 }}>
            {error.message || "Impossible de charger l'application."}
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
      </body>
    </html>
  );
}
