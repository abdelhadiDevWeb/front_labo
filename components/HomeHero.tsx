import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  HeartPulse,
  MapPin,
  ShieldCheck,
} from "lucide-react";

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Fournisseurs vérifiés" },
  { icon: Activity, label: "Suivi en temps réel" },
  { icon: Clock, label: "Commande 24h/24" },
  { icon: MapPin, label: "69 wilayas couvertes" },
];

const SPECIALTIES = [
  "Biochimie",
  "Hématologie",
  "Immunologie",
  "Microbiologie",
  "Sérologie",
  "Hormonologie",
];

type HomeHeroProps = {
  brandName: string;
  isAuthenticated: boolean;
};

function EcgLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 40" fill="none" className={className} aria-hidden>
      <path
        d="M0 22 H56 L62 22 L68 10 L76 34 L84 4 L92 28 L98 22 H200"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="animate-ecg-trace"
      />
    </svg>
  );
}

export default function HomeHero({ brandName, isAuthenticated }: HomeHeroProps) {
  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-teal-100/60 blur-3xl" />
      </div>

      <div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-sky-800 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Plateforme B2B dédiée à la biologie médicale
            </div>

            <h1 className="animate-fade-in-up animation-delay-100 mt-5 sm:mt-6 text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              L&apos;approvisionnement de votre laboratoire,{" "}
              <span className="bg-gradient-to-r from-blue-700 via-sky-600 to-teal-500 bg-clip-text text-transparent">
                simple, fiable et rapide.
              </span>
            </h1>

            <p className="animate-fade-in-up animation-delay-200 mt-5 sm:mt-6 mx-auto lg:mx-0 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600">
              {brandName} centralise l&apos;accès aux fournisseurs de réactifs, consommables et
              équipements&nbsp;: comparez les meilleurs prix, commandez en quelques clics et suivez
              vos livraisons partout en Algérie.
            </p>

            <div className="animate-fade-in-up animation-delay-300 mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link
                href="/allthings"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-blue-700/25 transition-all duration-300 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-700/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
              >
                Découvrir la marketplace
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href={isAuthenticated ? "/orders" : "/register?type=client"}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-slate-800 shadow-sm transition-all duration-300 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
              >
                {isAuthenticated ? "Mes réserves" : "Créer un compte laboratoire"}
              </Link>
            </div>

            {!isAuthenticated && (
              <p className="animate-fade-in-up animation-delay-400 mt-4 text-sm text-slate-500">
                Vous êtes fournisseur ?{" "}
                <Link
                  href="/register?type=supplier"
                  className="font-semibold text-teal-700 underline-offset-4 hover:underline"
                >
                  Rejoindre la plateforme
                </Link>
              </p>
            )}

            <ul className="animate-fade-in-up animation-delay-500 mt-8 sm:mt-10 grid grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto lg:mx-0">
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white/70 px-3 py-2.5 text-left text-xs sm:text-sm font-medium text-slate-700 shadow-sm backdrop-blur"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual */}
          <div className="animate-fade-in-up animation-delay-300 relative mx-auto w-full max-w-xl lg:max-w-none lg:self-start lg:-mt-10">
            <div
              aria-hidden
              className="absolute -inset-4 sm:-inset-6 rounded-[2.5rem] bg-gradient-to-tr from-blue-100 via-sky-50 to-teal-100 blur-2xl"
            />

            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border-4 border-white shadow-2xl shadow-sky-900/15 ring-1 ring-slate-900/5">
              <Image
                src="/images/1.png"
                alt="Microscope dans un laboratoire d'analyses médicales"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, (min-width: 640px) 576px, 100vw"
                className="object-cover object-[65%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" />
            </div>

            <div className="hidden sm:block absolute -bottom-10 -left-6 lg:-left-10 w-36 md:w-44 aspect-square overflow-hidden rounded-2xl border-4 border-white shadow-xl ring-1 ring-slate-900/5">
              <Image
                src="/images/2.png"
                alt="Verrerie et réactifs de laboratoire"
                fill
                sizes="176px"
                className="object-cover"
              />
            </div>

            <div className="absolute left-3 top-4 sm:-left-6 sm:top-8 lg:-left-4">
              <div className="animate-hero-float flex items-center gap-3 rounded-2xl border border-white bg-white/90 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-lg shadow-slate-900/10 backdrop-blur-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">Commande confirmée</p>
                  <p className="text-[11px] sm:text-xs text-slate-500">Validée par le fournisseur</p>
                </div>
              </div>
            </div>

            <div className="absolute right-3 -top-4 sm:-right-4 sm:-top-5">
              <div
                style={{ animationDelay: "1.5s" }}
                className="animate-hero-float inline-flex items-center gap-1.5 rounded-full border border-white bg-white/90 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-sky-800 shadow-lg shadow-slate-900/10 backdrop-blur-md">
                <BadgeCheck className="h-4 w-4 text-sky-600" />
                Fournisseur vérifié
              </div>
            </div>

            <div className="absolute right-3 bottom-4 sm:-right-6 sm:-bottom-8 lg:-right-10">
              <div
                style={{ animationDelay: "3s" }}
                className="animate-hero-float w-52 sm:w-60 rounded-2xl border border-white bg-white/90 p-3.5 sm:p-4 shadow-lg shadow-slate-900/10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                    <HeartPulse className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">Stock en temps réel</p>
                    <p className="text-[11px] text-slate-500">Disponibilité actualisée</p>
                  </div>
                </div>
                <EcgLine className="mt-2 h-8 w-full text-sky-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="animate-fade-in-up animation-delay-600 mt-16 sm:mt-20 border-t border-slate-200/70 pt-6 sm:pt-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Réactifs, consommables et équipements pour
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-10">
            {SPECIALTIES.map((name) => (
              <li key={name} className="text-sm sm:text-base font-semibold text-slate-500">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
