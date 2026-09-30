"use client";

/**
 * Sponsored banner under the header — 200px full-bleed slides.
 * Video sponsors are shown uncropped (framed on sm+) and can be opened
 * in a lightbox with sound and controls.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  PlayCircle,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { getSponsoredProducts, SponsoredPublicProduct } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { catalogItemHref } from "@/lib/catalog-item";
import CatalogPrice from "@/components/CatalogPrice";

const BANNER_H = 200;
const AUTO_MS = 5500;
/** A video slide advances when the video ends, or after this cap for long videos. */
const VIDEO_MAX_MS = 45_000;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type LightboxState = { src: string; href: string; product: SponsoredPublicProduct };

function SponsorVideoLightbox({
  src,
  href,
  product,
  onClose,
}: LightboxState & { onClose: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const subtitle = [product.supplier?.name, product.brand, product.category]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vidéo — ${product.name}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-neutral-950 shadow-2xl ring-1 ring-white/10 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Sponsorisé
            </span>
            <h3 className="truncate text-base font-bold text-white sm:text-lg">{product.name}</h3>
            {subtitle ? <p className="truncate text-xs text-white/60 sm:text-sm">{subtitle}</p> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-video max-h-[70vh] w-full bg-black">
          {status !== "error" ? (
            <video
              src={src}
              className="absolute inset-0 h-full w-full object-contain"
              controls
              autoPlay
              playsInline
              onCanPlay={() => setStatus("ready")}
              onError={() => setStatus("error")}
            />
          ) : null}
          {status === "loading" ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-white/70" />
            </div>
          ) : null}
          {status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/80">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm font-medium">Impossible de lire cette vidéo.</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <CatalogPrice
            amount={product.price}
            className="text-lg font-bold text-white"
            lockedClassName="text-sm font-medium text-white/70"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:flex-none"
            >
              Fermer
            </button>
            <Link
              href={href}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 sm:flex-none"
            >
              Voir l&apos;annonce
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function HomeSponsoredHero() {
  const [products, setProducts] = useState<SponsoredPublicProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failedVideos, setFailedVideos] = useState<Set<string>>(() => new Set());
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getSponsoredProducts();
        if (cancelled) return;
        if (result.success && result.data?.products?.length) {
          setProducts(shuffleArray(result.data.products));
        } else {
          setProducts([]);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = products.length;
  const go = useCallback(
    (dir: 1 | -1) => {
      if (count < 2) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  const videoSrcFor = useCallback(
    (p: SponsoredPublicProduct | undefined) =>
      p?.sponsorVideo && !failedVideos.has(p.id) ? getMediaUrl(p.sponsorVideo) || null : null,
    [failedVideos]
  );

  const currentIsVideo = Boolean(videoSrcFor(products[index]));

  useEffect(() => {
    if (count < 2 || paused || lightbox) return;
    const id = window.setTimeout(() => go(1), currentIsVideo ? VIDEO_MAX_MS : AUTO_MS);
    return () => window.clearTimeout(id);
  }, [count, paused, lightbox, go, index, currentIsVideo]);

  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) return;
    video.muted = muted;
    if (lightbox) video.pause();
    else void video.play().catch(() => {});
  }, [muted, lightbox, index]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  // First paint: nothing. After API: show only if there are sponsors.
  if (!loaded || count === 0) return null;

  const product = products[index];
  if (!product) return null;
  const detail = [product.brand, product.category].filter(Boolean).join(" · ");
  const productHref = catalogItemHref(product.itemType, product.id);
  const currentVideoSrc = videoSrcFor(product);
  /** Sponsor video first, otherwise the item's own video (image sponsors can still offer it). */
  const modalVideoSrc =
    currentVideoSrc || (product.video ? getMediaUrl(product.video) || null : null);
  const openLightbox = () => {
    if (modalVideoSrc) {
      setLightbox({ src: modalVideoSrc, href: productHref, product });
    }
  };

  return (
    <section
      id="sponsored-section"
      className="relative border-b border-neutral-200 scroll-mt-24"
      style={{ height: BANNER_H }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-full overflow-hidden bg-neutral-900" style={{ height: BANNER_H }}>
        {products.map((p, i) => {
          const src = (p.sponsorImage || p.images?.[0])
            ? getMediaUrl(p.sponsorImage || p.images![0])
            : null;
          const videoSrc = videoSrcFor(p);
          const active = i === index;
          return (
            <div
              key={p.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                active ? "opacity-100 z-[1]" : "opacity-0 z-0"
              }`}
              aria-hidden={!active}
            >
              {videoSrc ? (
                <>
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
                    />
                  ) : null}
                  {active ? (
                    <video
                      ref={activeVideoRef}
                      src={videoSrc}
                      poster={src ?? undefined}
                      className="absolute left-0 top-0 h-full w-full cursor-pointer object-cover sm:left-auto sm:right-12 sm:top-3 sm:h-[176px] sm:w-auto sm:aspect-video sm:rounded-xl sm:bg-black sm:object-contain sm:shadow-2xl sm:ring-1 sm:ring-white/15"
                      autoPlay
                      muted={muted}
                      loop={count < 2}
                      playsInline
                      preload="metadata"
                      onClick={openLightbox}
                      onEnded={() => go(1)}
                      onError={() =>
                        setFailedVideos((prev) => new Set(prev).add(p.id))
                      }
                    />
                  ) : null}
                </>
              ) : src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                  <ImageIcon className="h-8 w-8 text-neutral-500" />
                </div>
              )}
            </div>
          );
        })}

        <div
          className={`pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r ${
            currentIsVideo
              ? "from-black/80 via-black/30 to-transparent sm:via-black/40 sm:to-transparent"
              : "from-black/85 via-black/50 to-transparent"
          }`}
          aria-hidden
        />

        <div className="relative z-[3] flex h-full items-center max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pointer-events-none">
          <div
            className={`min-w-0 flex-1 pr-10 pointer-events-auto ${
              currentIsVideo ? "sm:pr-[360px]" : "sm:pr-16"
            }`}
          >
            <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm border border-white/20 mb-1">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Sponsorisé
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight line-clamp-1 drop-shadow">
              {product.name}
            </h2>
            {detail ? (
              <p className="mt-0.5 text-[11px] sm:text-xs text-white/70 line-clamp-1">{detail}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
              <CatalogPrice
                amount={product.price}
                className="text-sm sm:text-base font-bold text-white"
                lockedClassName="text-[11px] font-medium text-white/80"
                linkToLogin={false}
              />
              <Link
                href={productHref}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                Voir
                <ArrowRight className="h-3 w-3" />
              </Link>
              {modalVideoSrc ? (
                <button
                  type="button"
                  onClick={openLightbox}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-[11px] sm:text-xs font-semibold text-white shadow-lg shadow-rose-900/30 hover:bg-rose-700 transition-colors"
                >
                  <PlayCircle className="h-4 w-4" />
                  Voir la vidéo
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {currentVideoSrc ? (
          <div className="absolute bottom-4 right-10 sm:bottom-5 sm:right-14 z-[4] flex gap-1.5">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="rounded-full bg-black/55 p-1.5 text-white backdrop-blur-sm hover:bg-black/75"
              aria-label={muted ? "Activer le son" : "Couper le son"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={openLightbox}
              className="rounded-full bg-black/55 p-1.5 text-white backdrop-blur-sm hover:bg-black/75"
              aria-label="Agrandir la vidéo"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-1 sm:left-2 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-black/40 p-1 text-white backdrop-blur-sm hover:bg-black/60"
              aria-label="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-1 sm:right-2 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-black/40 p-1 text-white backdrop-blur-sm hover:bg-black/60"
              aria-label="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-1.5 left-1/2 z-[4] flex -translate-x-1/2 gap-1">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === index ? "w-4 bg-white" : "w-1 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightbox ? <SponsorVideoLightbox {...lightbox} onClose={closeLightbox} /> : null}
    </section>
  );
}
