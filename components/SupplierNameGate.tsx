"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Building2, Lock } from "lucide-react";

type Props = {
  /** When true, show the real supplier UI (`children`). */
  visible: boolean;
  children: ReactNode;
  className?: string;
  loginHref?: string;
};

/**
 * Hides supplier identity from guests until they log in.
 */
export default function SupplierNameGate({
  visible,
  children,
  className = "flex items-center gap-2 text-sm text-gray-500",
  loginHref = "/login",
}: Props) {
  if (visible) return <>{children}</>;

  return (
    <div className={className}>
      <Lock className="w-4 h-4 shrink-0 text-gray-400" />
      <span className="truncate">
        Fournisseur masqué —{" "}
        <Link
          href={loginHref}
          className="font-semibold text-blue-600 hover:underline"
        >
          connectez-vous
        </Link>{" "}
        pour le voir
      </span>
      <Building2 className="w-4 h-4 shrink-0 text-gray-300 hidden sm:block" />
    </div>
  );
}
