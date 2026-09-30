import { Calendar, Megaphone, Package } from "lucide-react";
import type { SubscriptionType } from "@/lib/api";

export const formatPlanDuration = (days: number) => {
  if (days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return `${months} mois`;
  }
  return `${days} jour${days > 1 ? "s" : ""}`;
};

const formatSponsorHours = (hours: number) => {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${hours} h (${days} jour${days > 1 ? "s" : ""})`;
  }
  return `${hours} heure${hours > 1 ? "s" : ""}`;
};

type PlanLike = Pick<SubscriptionType, "max_products" | "sponsorsPerMonth" | "sponsorDurationHours">;

export function PlanMaxProductsInfo({
  plan,
  role,
}: {
  plan: PlanLike;
  role: "supplier" | "client";
}) {
  if (role !== "supplier" || plan.max_products == null) return null;
  const max = plan.max_products;
  return (
    <div className="flex items-start gap-2 text-gray-700 text-sm">
      <Package className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
      <span>
        {max === 0
          ? "Aucune annonce incluse"
          : `Jusqu'à ${max} annonce${max > 1 ? "s" : ""} (produits, machines et services)`}
      </span>
    </div>
  );
}

export function PlanSponsorInfo({ plan }: { plan: PlanLike }) {
  const sponsorsCount = plan.sponsorsPerMonth ?? 0;
  const durationHours =
    plan.sponsorDurationHours && plan.sponsorDurationHours >= 1
      ? plan.sponsorDurationHours
      : sponsorsCount > 0
        ? 48
        : 0;

  if (sponsorsCount <= 0) {
    return (
      <div className="flex items-start gap-2 text-gray-500 text-sm">
        <Megaphone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <span>Aucun sponsoring inclus</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 text-amber-900 text-sm font-medium">
        <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          {sponsorsCount} sponsor{sponsorsCount > 1 ? "s" : ""} inclus
        </span>
      </div>
      <div className="flex items-center gap-2 text-amber-900 text-sm font-medium">
        <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Temps de chaque sponsor&nbsp;: {formatSponsorHours(durationHours)}</span>
      </div>
    </div>
  );
}
