"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSessionRole } from "@/lib/api";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const TILE_HEIGHT = 72;

const buildTile = (label: string) => {
  const width = Math.max(220, Math.round(label.length * 6.4) + 80);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${TILE_HEIGHT}">` +
    `<text x="10" y="${TILE_HEIGHT / 2 + 4}" transform="rotate(-8 ${width / 2} ${TILE_HEIGHT / 2})" ` +
    `font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="rgba(15,23,42,0.2)">` +
    `${escapeXml(label)}</text></svg>`;
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, width };
};

type PriceWatermarkProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Overlays a faint repeated "email · date" of the logged-in account so any photo
 * or screenshot of the price shows who it was shown to.
 */
export default function PriceWatermark({ children, className = "" }: PriceWatermarkProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getSessionRole();
      if (cancelled || !session?.email) return;
      setLabel(`${session.email} · ${new Date().toLocaleDateString("fr-FR")}`);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tile = label ? buildTile(label) : null;

  return (
    <div className={`relative isolate overflow-hidden rounded-xl ${className}`}>
      {children}
      {tile && (
        <div
          aria-hidden
          className="pointer-events-none select-none absolute inset-0 z-10"
          style={{
            backgroundImage: `${tile.url}, ${tile.url}`,
            backgroundSize: `${tile.width}px ${TILE_HEIGHT}px`,
            backgroundPosition: `0 0, ${Math.round(tile.width / 2)}px ${TILE_HEIGHT / 2}px`,
          }}
        />
      )}
    </div>
  );
}
