"use client";

import { useEffect, useRef } from "react";

type AntiCapturePriceProps = {
  text: string;
  /** Font size in CSS pixels. */
  fontSize?: number;
  /** Hex colour of the "on" dots. */
  color?: string;
  /** Hex colour of the "off" dots. */
  background?: string;
  className?: string;
};

/** One noise shift per 60 Hz frame, independent of the display refresh rate. */
const STEP_MS = 1000 / 60;

const hexToRgb = (hex: string): [number, number, number] => {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const fillRandom = (buffer: Uint8Array, start: number, end: number) => {
  for (let i = start; i < end; i += 1) buffer[i] = Math.random() < 0.5 ? 1 : 0;
};

/**
 * Motion-defined text: the glyph dots scroll up while the background dots scroll
 * down. Every single frame is uniform random noise, so a photo or screenshot
 * (one frame, or several averaged by exposure) shows no readable value — only
 * the moving pattern reveals it to the eye.
 */
export default function AntiCapturePrice({
  text,
  fontSize = 32,
  color = "#1d4ed8",
  background = "#eff6ff",
  className = "",
}: AntiCapturePriceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;

      const fontFamily = getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";
      const font = (size: number) => `800 ${size}px ${fontFamily}`;
      const setSpacing = (target: CanvasRenderingContext2D, size: number) => {
        if ("letterSpacing" in target) {
          (target as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
            `${size * 0.1}px`;
        }
      };

      // CSS down-scaling blurs the dots and kills the motion contrast, so shrink the font to fit instead.
      ctx.font = font(fontSize);
      setSpacing(ctx, fontSize);
      const naturalWidth = ctx.measureText(text).width + fontSize * 0.6;
      const parent = canvas.parentElement;
      const parentStyle = parent ? getComputedStyle(parent) : null;
      const available =
        parent && parentStyle
          ? parent.clientWidth -
            (parseFloat(parentStyle.paddingLeft) || 0) -
            (parseFloat(parentStyle.paddingRight) || 0)
          : naturalWidth;
      const size =
        naturalWidth > available
          ? Math.max(14, Math.floor((fontSize * available) / naturalWidth))
          : fontSize;

      const cell = Math.max(1, Math.floor(size / 16));
      const pad = Math.round(size * 0.3);
      ctx.font = font(size);
      setSpacing(ctx, size);
      const textWidth = ctx.measureText(text).width;
      const cols = Math.ceil((textWidth + pad * 2) / cell);
      const rows = Math.ceil((size * 1.2 + pad * 2) / cell);
      const total = cols * rows;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);

      canvas.width = Math.round(cols * cell * dpr);
      canvas.height = Math.round(rows * cell * dpr);
      canvas.style.width = `${cols * cell}px`;

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = cols;
      maskCanvas.height = rows;
      const maskCtx = maskCanvas.getContext("2d");
      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = cols;
      frameCanvas.height = rows;
      const frameCtx = frameCanvas.getContext("2d");
      if (!maskCtx || !frameCtx) return;

      const glyphSize = size / cell;
      maskCtx.font = font(glyphSize);
      setSpacing(maskCtx, glyphSize);
      maskCtx.textBaseline = "middle";
      maskCtx.fillStyle = "#000";
      maskCtx.strokeStyle = "#000";
      maskCtx.lineWidth = Math.max(0.5, glyphSize * 0.04);
      maskCtx.fillText(text, pad / cell, rows / 2);
      maskCtx.strokeText(text, pad / cell, rows / 2);
      const alpha = maskCtx.getImageData(0, 0, cols, rows).data;

      const mask = new Uint8Array(total);
      for (let i = 0; i < total; i += 1) mask[i] = alpha[i * 4 + 3] > 64 ? 1 : 0;

      const backgroundNoise = new Uint8Array(total);
      const glyphNoise = new Uint8Array(total);
      fillRandom(backgroundNoise, 0, total);
      fillRandom(glyphNoise, 0, total);

      const on = hexToRgb(color);
      const off = hexToRgb(background);
      const frame = frameCtx.createImageData(cols, rows);

      const draw = () => {
        const px = frame.data;
        for (let i = 0; i < total; i += 1) {
          const lit = mask[i] ? glyphNoise[i] : backgroundNoise[i];
          const rgb = lit ? on : off;
          const o = i * 4;
          px[o] = rgb[0];
          px[o + 1] = rgb[1];
          px[o + 2] = rgb[2];
          px[o + 3] = 255;
        }
        frameCtx.putImageData(frame, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
      };

      const step = () => {
        backgroundNoise.copyWithin(cols, 0, total - cols);
        fillRandom(backgroundNoise, 0, cols);
        glyphNoise.copyWithin(0, cols, total);
        fillRandom(glyphNoise, total - cols, total);
      };

      let last = performance.now();
      let pending = 0;
      const loop = (now: number) => {
        pending += Math.min(now - last, 100);
        last = now;
        if (pending >= STEP_MS) {
          while (pending >= STEP_MS) {
            step();
            pending -= STEP_MS;
          }
          draw();
        }
        raf = requestAnimationFrame(loop);
      };

      draw();
      raf = requestAnimationFrame(loop);
    };

    if (document.fonts?.ready) {
      void document.fonts.ready.then(start);
    } else {
      start();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [text, fontSize, color, background]);

  return (
    <canvas
      ref={canvasRef}
      width={1}
      height={1}
      role="img"
      aria-label={text}
      className={`block max-w-full h-auto rounded-xl select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
