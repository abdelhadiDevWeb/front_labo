import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

const BRAND = "Dz Labmarket";
const EMAIL = "dzmarketLab@gmail.com";
const PHONE = "0781079959";
const PHONE_TEL = "+213781079959";
const LOCATION = "Blida, Algérie";

export default function ContactPage() {
  return (
    <main className="bg-[#f3f6fb] text-slate-900">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(160deg,#0f766e_0%,#0e4d6e_50%,#0b3a6e_100%)] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.75) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">
            Contact
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Parlons de votre besoin
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-teal-50/95 sm:text-lg">
            Une question sur un compte, une réserve ou un partenariat fournisseur
            ? Écrivez-nous ou appelez l’équipe {BRAND}.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <a
            href={`mailto:${EMAIL}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-600/40 hover:bg-teal-50/40"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </p>
            <p className="mt-2 break-all text-lg font-semibold text-slate-900 group-hover:text-teal-800">
              {EMAIL}
            </p>
            <p className="mt-2 text-sm text-slate-500">Réponse sous 24–48 h ouvrés</p>
          </a>

          <a
            href={`tel:${PHONE_TEL}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-600/40 hover:bg-teal-50/40"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
              <Phone className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Téléphone
            </p>
            <p className="mt-2 break-all text-lg font-semibold text-slate-900 group-hover:text-teal-800">
              {PHONE}
            </p>
            <p className="mt-2 text-sm text-slate-500">Appels & WhatsApp</p>
          </a>

          <a
            href="https://www.google.com/maps/search/?api=1&query=Blida%2C%20Algeria"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-600/40 hover:bg-teal-50/40"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Localisation
            </p>
            <p className="mt-2 break-all text-lg font-semibold text-slate-900 group-hover:text-teal-800">
              {LOCATION}
            </p>
            <p className="mt-2 text-sm text-slate-500">Siège / zone d’activité</p>
          </a>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Coordonnées
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${EMAIL}`}
                  className="break-all font-medium text-blue-700 hover:underline"
                >
                  {EMAIL}
                </a>
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Téléphone
              </dt>
              <dd className="mt-1">
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {PHONE}
                </a>
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Adresse / ville
              </dt>
              <dd className="mt-1 font-medium text-slate-900">{LOCATION}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-slate-600">
            Pour un suivi plus rapide, précisez votre rôle (laboratoire ou
            fournisseur), votre email de compte et le sujet (inscription,
            abonnement, réserve, catalogue).
          </p>
          <div className="mt-6">
            <Link
              href="/about"
              className="text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              En savoir plus sur {BRAND} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
