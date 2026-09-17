import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  FlaskConical,
  Microscope,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";

const BRAND = "Dz Labmarket";

export default function AboutPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(160deg,#0b3a6e_0%,#0e7490_55%,#155e75_100%)] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
            À propos
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {BRAND}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cyan-50/95 sm:text-lg">
            La marketplace professionnelle qui relie les laboratoires d’analyses
            et leurs fournisseurs partenaires — produits, machines et services,
            de la recherche à la livraison.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Notre mission
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          {BRAND} simplifie l’approvisionnement des laboratoires en Algérie. Les
          laboratoires trouvent des offres adaptées à leur activité ; les
          fournisseurs publient leur catalogue, reçoivent des réserves et gèrent
          le suivi jusqu’à la réception. Une plateforme unique pour gagner du
          temps, comparer sereinement et travailler avec des partenaires
          identifiés.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mb-10 flex items-center gap-3">
            <FlaskConical className="h-7 w-7 text-blue-700" />
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Comment ça marche
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">1. Recherchez</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Parcourez réactifs, consommables, automates et services selon
                votre type de laboratoire.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
                <Package className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">2. Comparez</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Comparez prix, disponibilités, délais et fiches techniques entre
                fournisseurs vérifiés.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">3. Réservez</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Ajoutez au panier et confirmez votre réserve. Le fournisseur
                accepte ou refuse la demande.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">4. Suivez</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Suivez le statut (en attente, en cours, en route, arrivée)
                jusqu’à la réception.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-10 flex items-center gap-3">
          <Users className="h-7 w-7 text-cyan-700" />
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Ce que propose la plateforme
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-700 text-white">
              <Microscope className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Pour les laboratoires
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                "Catalogue produits, machines et services",
                "Réservation et suivi centralisés",
                "Accès fournisseurs et favoris",
                "Proximité géographique (wilaya)",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-700 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Pour les fournisseurs
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                "Publication du catalogue Marché",
                "Gestion des réserves et livraisons",
                "Sponsoring et promotions",
                "Statistiques d’activité",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-700 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Confiance & sécurité
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                "Comptes vérifiés (documents + abonnement)",
                "Paiement suivi côté plateforme",
                "Espace dédié labo / fournisseur / admin",
                "Support et signalement des problèmes",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">
              Une question sur {BRAND} ?
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Notre équipe à Blida est disponible pour vous accompagner.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Nous contacter
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
