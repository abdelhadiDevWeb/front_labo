import Link from "next/link";
import { ArrowLeft, Construction, MessageCircle, Radio, Users, Video } from "lucide-react";

const UPCOMING_FEATURES = [
  {
    icon: Video,
    title: "Pour les fournisseurs",
    text: "Lancez un live pour présenter vos produits, faire des démonstrations et expliquer leur utilisation aux laboratoires.",
  },
  {
    icon: Users,
    title: "Pour les laboratoires",
    text: "Suivez les présentations, découvrez les nouveautés et obtenez toutes les informations directement auprès des fournisseurs.",
  },
  {
    icon: MessageCircle,
    title: "Comme une conférence en ligne",
    text: "Posez vos questions en direct et échangez en temps réel avec les fournisseurs pendant la session.",
  },
];

export default function LivePage() {
  return (
    <main className="bg-[#f3f6fb] text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ring-1 ring-white/30 backdrop-blur-sm sm:text-sm">
            Live
          </span>

          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm sm:h-24 sm:w-24">
            <Radio className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Le Live Dz Labmarket
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-blue-50 sm:text-lg">
            Le Live permet aux fournisseurs d&apos;animer des sessions en direct pour
            présenter et expliquer leurs produits, et aux laboratoires d&apos;obtenir
            toutes les informations dont ils ont besoin. C&apos;est comme une
            conférence en ligne.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400/95 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg">
            <Construction className="h-4 w-4" />
            Bientôt disponible
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <h2 className="mb-6 text-center text-xl font-bold text-slate-900 sm:mb-8 sm:text-2xl">
          Comment ça marche
        </h2>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {UPCOMING_FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/home"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-cyan-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/allthings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-6 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Explorer le catalogue
          </Link>
        </div>
      </section>
    </main>
  );
}
