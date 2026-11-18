"use client";

import { useState, useEffect } from "react";
import {
  Users,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  FlaskConical,
  BarChart3,
  CreditCard,
  FolderTree,
  ShieldCheck,
} from "lucide-react";
import { getAdminStatistics, AdminStatistics } from "@/lib/api";
import Link from "next/link";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import ExpandableValue from "@/components/ExpandableValue";

const statusLabels: { [key: string]: string } = {
  "en cours": "En cours",
  "on route": "En route",
  arrived: "Livré",
};

const statusColors: { [key: string]: string } = {
  "en cours": "bg-sky-100 text-sky-800",
  "on route": "bg-amber-100 text-amber-800",
  arrived: "bg-emerald-100 text-emerald-800",
};

const quickLinks = [
  {
    href: "/dashboard/users",
    label: "Utilisateurs",
    hint: "Labs & fournisseurs",
    icon: Users,
  },
  {
    href: "/dashboard/orders",
    label: "Commandes",
    hint: "Réserves marketplace",
    icon: ShoppingCart,
  },
  {
    href: "/dashboard/subscriptions",
    label: "Abonnements",
    hint: "Activation comptes",
    icon: CreditCard,
  },
  {
    href: "/dashboard/categories",
    label: "Catégories",
    hint: "Catalogue labo",
    icon: FolderTree,
  },
  {
    href: "/dashboard/statistics",
    label: "Statistiques",
    hint: "Indicateurs clés",
    icon: BarChart3,
  },
];

export default function DashboardPage() {
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatistics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAdminStatistics();
        if (result.success && result.data) {
          setStatistics(result.data);
        } else {
          setError(result.message || "Erreur lors du chargement des statistiques");
        }
      } catch (err) {
        console.error("Load statistics error:", err);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const formatCurrency = (amount: number) => {
    return (
      new Intl.NumberFormat("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + " DA"
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("fr-FR").format(num);
  };

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (error || !statistics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-rose-600 mb-4">{error || "Erreur lors du chargement des données"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const isLimited = statistics.isLimited === true;

  const stats = isLimited
    ? [
        {
          name: "Utilisateurs",
          value: formatNumber(statistics.totalUsers),
          subtitle: `${statistics.totalClients} labs · ${statistics.totalSuppliers} fournisseurs`,
          icon: Users,
          accent: "from-blue-600 to-blue-700",
          href: "/dashboard/statistics",
        },
        {
          name: "Commandes",
          value: formatNumber(statistics.totalOrders),
          subtitle:
            statistics.growth?.orders != null
              ? `${statistics.growth.orders.percentage >= 0 ? "+" : ""}${statistics.growth.orders.percentage.toFixed(1)}% ce mois`
              : "Total des commandes",
          icon: ShoppingCart,
          accent: "from-slate-700 to-slate-800",
          href: "/dashboard/statistics",
        },
        {
          name: "Produits",
          value: formatNumber(statistics.totalProducts ?? 0),
          subtitle: "Catalogue actif",
          icon: Package,
          accent: "from-cyan-700 to-blue-800",
          href: "/dashboard/statistics",
        },
      ]
    : [
        {
          name: "Revenus Totaux",
          value: formatCurrency(statistics.totalRevenue ?? 0),
          change: `${(statistics.growth?.revenue.percentage ?? 0) >= 0 ? "+" : ""}${(statistics.growth?.revenue.percentage ?? 0).toFixed(1)}%`,
          changeType: (statistics.growth?.revenue.percentage ?? 0) >= 0 ? "positive" : "negative",
          icon: DollarSign,
          accent: "from-blue-600 to-cyan-600",
        },
        {
          name: "Total Utilisateurs",
          value: formatNumber(statistics.totalUsers),
          change: `${statistics.totalClients} labs · ${statistics.totalSuppliers} fournisseurs`,
          changeType: "info" as const,
          icon: Users,
          accent: "from-blue-600 to-cyan-600",
        },
        {
          name: "Total Commandes",
          value: formatNumber(statistics.totalOrders),
          change: `${(statistics.growth?.orders.percentage ?? 0) >= 0 ? "+" : ""}${(statistics.growth?.orders.percentage ?? 0).toFixed(1)}%`,
          changeType: (statistics.growth?.orders.percentage ?? 0) >= 0 ? "positive" : "negative",
          icon: ShoppingCart,
          accent: "from-slate-700 to-slate-900",
        },
        {
          name: "Total Produits",
          value: formatNumber(statistics.totalProducts ?? 0),
          change: "En catalogue",
          changeType: "info" as const,
          icon: Package,
          accent: "from-cyan-700 to-blue-800",
        },
      ];

  return (
    <div className="space-y-4 sm:space-y-5 xl:space-y-6">
      {/* Hero — lab admin */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-900/10 bg-slate-950 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, rgba(37,99,235,0.40), transparent 42%), radial-gradient(circle at 88% 10%, rgba(8,145,178,0.45), transparent 40%), linear-gradient(135deg, rgba(15,23,42,0.2), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex flex-col gap-4 p-4 sm:p-5 xl:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200">
              <FlaskConical className="h-3.5 w-3.5" />
              Console admin laboratoire
            </div>
            <h2 className="text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight">
              {isLimited ? "Vue d’ensemble" : "Pilotage Dz Labmarket"}
            </h2>
            <p className="mt-1.5 text-sm sm:text-[15px] text-slate-300 leading-relaxed">
              {isLimited
                ? "Aperçu statistique — les détails financiers et contacts restent réservés aux administrateurs complets."
                : "Suivez labs, fournisseurs, commandes et abonnements depuis une console conçue pour le marketplace laboratoire."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />
              Accès sécurisé
            </span>
            <Link
              href="/dashboard/statistics"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-blue-400 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </Link>
          </div>
        </div>
      </section>

      {/* Quick links — compact for small laptops */}
      {!isLimited && (
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
              >
                <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-slate-900 truncate">{link.label}</p>
                <p className="text-[11px] text-slate-500 truncate">{link.hint}</p>
              </Link>
            );
          })}
        </section>
      )}

      {/* KPI cards */}
      <div
        className={`grid grid-cols-2 ${
          isLimited ? "xl:grid-cols-3" : "xl:grid-cols-4"
        } gap-2.5 sm:gap-3 xl:gap-4`}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          const cardContent = (
            <div
              className={`h-full rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 xl:p-5 shadow-sm hover:shadow-md transition-all ${
                "href" in stat ? "cursor-pointer" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div
                  className={`bg-gradient-to-br ${stat.accent} p-2 sm:p-2.5 rounded-xl shadow-sm`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {isLimited && "subtitle" in stat && (
                  <span className="text-slate-500 text-[10px] sm:text-xs font-medium text-right max-w-[58%] leading-snug">
                    {stat.subtitle}
                  </span>
                )}
                {!isLimited && "changeType" in stat && stat.changeType === "positive" && (
                  <span className="inline-flex items-center text-blue-600 text-xs font-semibold">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    {stat.change}
                  </span>
                )}
                {!isLimited && "changeType" in stat && stat.changeType === "negative" && (
                  <span className="inline-flex items-center text-rose-600 text-xs font-semibold">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {stat.change}
                  </span>
                )}
                {!isLimited && "changeType" in stat && stat.changeType === "info" && (
                  <span className="text-slate-500 text-[10px] sm:text-xs font-medium text-right max-w-[55%] leading-snug">
                    {stat.change}
                  </span>
                )}
              </div>
              <h3 className="text-slate-500 text-[11px] sm:text-xs font-medium mb-0.5">
                {stat.name}
              </h3>
              <ExpandableValue
                value={stat.value}
                title={stat.name}
                maxLength={14}
                className="w-full"
                valueClassName="text-base sm:text-xl xl:text-2xl font-bold text-slate-900 tabular-nums"
              />
            </div>
          );

          if (isLimited && "href" in stat && stat.href) {
            return (
              <Link key={stat.name} href={stat.href}>
                {cardContent}
              </Link>
            );
          }

          return <div key={stat.name}>{cardContent}</div>;
        })}
      </div>

      {isLimited ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Statistiques détaillées</h3>
              <p className="text-slate-600 text-sm">
                Graphiques d&apos;activité (sans données financières ni contacts).
              </p>
            </div>
            <Link
              href="/dashboard/statistics"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Ouvrir les statistiques →
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-blue-50/40">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Commandes récentes
              </h3>
              <p className="text-xs text-slate-500 hidden sm:block">
                Dernières réserves sur le marketplace laboratoire
              </p>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-sm text-blue-700 hover:text-blue-800 font-semibold transition-colors shrink-0"
            >
              Voir toutes →
            </Link>
          </div>
          {statistics.recentOrders.length === 0 ? (
            <div className="p-10 text-center">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucune commande récente</p>
            </div>
          ) : (
            <>
              <div className="xl:hidden divide-y divide-slate-100">
                {statistics.recentOrders.map((order) => (
                  <div key={order.id} className="p-3.5 sm:p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        #{order.id.slice(-8)}
                      </p>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          statusColors[order.status] || "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-600">
                      {order.customer} → {order.supplier}
                    </p>
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        {order.productCount}{" "}
                        {order.productCount > 1 ? "produits" : "produit"} ·{" "}
                        {formatDate(order.date)}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(order.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      {[
                        "ID",
                        "Labo / Client",
                        "Fournisseur",
                        "Produits",
                        "Montant",
                        "Statut",
                        "Date",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {statistics.recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          #{order.id.slice(-8)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                          {order.customer}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {order.supplier}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {order.productCount}{" "}
                          {order.productCount > 1 ? "produits" : "produit"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {formatCurrency(order.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              statusColors[order.status] || "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {formatDate(order.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
