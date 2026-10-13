"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** Available stock; omit when unknown (no upper limit). */
  max?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  /** When set, "−" stays enabled at `min` and calls this (e.g. remove the cart line). */
  onDecrementBelowMin?: () => void;
  ariaLabel?: string;
};

const SIZES = {
  sm: { button: "h-8 w-8", input: "h-8 w-12 text-sm", icon: "h-3.5 w-3.5" },
  md: { button: "h-10 w-10", input: "h-10 w-16 text-base sm:text-lg", icon: "h-4 w-4" },
};

/** − / typed number / + ; typing is clamped to [min, max] and committed on blur or Enter. */
export default function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  disabled = false,
  onDecrementBelowMin,
  ariaLabel = "Quantité",
}: Props) {
  const [draft, setDraft] = useState(String(value));
  const hasMax = typeof max === "number" && Number.isFinite(max);
  const upper = hasMax ? Math.max(min, Math.floor(max as number)) : Infinity;
  const s = SIZES[size];

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(upper, Math.max(min, n));

  const commit = () => {
    const parsed = parseInt(draft, 10);
    const next = Number.isFinite(parsed) ? clamp(parsed) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const handleTyping = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    if (digits === "") {
      setDraft("");
      return;
    }
    const n = parseInt(digits, 10);
    if (n > upper) {
      setDraft(String(upper));
      onChange(upper);
      return;
    }
    setDraft(digits);
    if (n >= min) onChange(n);
  };

  const decrement = () => {
    if (value <= min) {
      onDecrementBelowMin?.();
      return;
    }
    onChange(clamp(value - 1));
  };

  const buttonClass = `${s.button} flex shrink-0 items-center justify-center rounded-lg border-2 border-gray-300 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40`;

  return (
    <div className="inline-flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || (value <= min && !onDecrementBelowMin)}
        className={buttonClass}
        aria-label="Diminuer la quantité"
      >
        <Minus className={s.icon} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => handleTyping(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`${s.input} rounded-lg border-2 border-gray-300 bg-white text-center font-semibold text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50`}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= upper}
        className={buttonClass}
        aria-label="Augmenter la quantité"
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}
