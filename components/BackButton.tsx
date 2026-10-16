"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { navigateBack } from "@/lib/navigate-back";

type BackButtonProps = {
  /** Used when there is no in-app history (direct open / refresh). */
  fallbackHref: string;
  className?: string;
  iconClassName?: string;
  ariaLabel?: string;
  label?: ReactNode;
  children?: ReactNode;
};

/**
 * Header-style return control: previous page, or `fallbackHref` if none.
 */
export default function BackButton({
  fallbackHref,
  className = "p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0 transition-colors",
  iconClassName = "w-5 h-5",
  ariaLabel = "Retour",
  label,
  children,
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => navigateBack(router, fallbackHref)}
      className={className}
      aria-label={ariaLabel}
    >
      {children ?? (
        <>
          <ArrowLeft className={iconClassName} />
          {label}
        </>
      )}
    </button>
  );
}
