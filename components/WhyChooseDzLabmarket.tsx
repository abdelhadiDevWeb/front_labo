import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Clock,
  FileCheck2,
  Layers,
  Megaphone,
  Microscope,
  MousePointerClick,
  RefreshCw,
  ShoppingCart,
  Target,
  Timer,
  Truck,
  Wallet,
  Warehouse,
  Zap,
} from "lucide-react";

type Advantage = { icon: LucideIcon; title?: string; text: string };

export const LAB_ADVANTAGES: Advantage[] = [
  { icon: Layers, text: "Multiples fournisseurs agrégés sur une interface unique." },
  {
    icon: Timer,
    title: "Gain de Temps",
    text: "Stop aux appels répétés, trouvez votre produit immédiatement.",
  },
  {
    icon: Truck,
    title: "Livraisons Rapides",
    text: "Repérez le meilleur délai d'expédition en un coup d'œil.",
  },
  {
    icon: Clock,
    title: "Commande 24h/24",
    text: "Achetez en toute autonomie, même hors des heures d'analyse.",
  },
  {
    icon: Wallet,
    title: "Budget Optimisé",
    text: "Toutes les promotions et ventes flashs regroupées au même endroit.",
  },
  {
    icon: FileCheck2,
    title: "Références Exactes",
    text: "Fiches techniques validées pour zéro erreur de commande.",
  },
  {
    icon: MousePointerClick,
    title: "Achat en 1 Clic",
    text: "Réapprovisionnez vos consommables via l'historique centralisé.",
  },
];

export const SUPPLIER_ADVANTAGES: Advantage[] = [
  {
    icon: Target,
    title: "Audience 100% Ciblée",
    text: "Visibilité nationale directe auprès des décideurs de laboratoires sur les 58 wilayas.",
  },
  {
    icon: ShoppingCart,
    title: "Ventes 24h/24 & Zéro Erreur",
    text: "Prise de commande autonome à tout moment sans erreur de référence catalogue.",
  },
  {
    icon: Megaphone,
    title: "Publicité & Promotion Scientifique",
    text: "Bannières, vidéos de démonstration, promotions ciblées et espace dédié aux webinaires/conférences.",
  },
  {
    icon: Zap,
    title: "Déstockage & Ventes Flash",
    text: "Liquidation accélérée des réactifs à DLC courte et achats groupés à fort volume.",
  },
  {
    icon: BarChart3,
    title: "Gain de Temps & Analytics",
    text: "Automatisation des commandes, grilles tarifaires sur-mesure et statistiques en temps réel.",
  },
  {
    icon: RefreshCw,
    title: "Image & Réapprovisionnement",
    text: "Modernisation de votre image de marque et commande récurrente en 1 clic pour vos clients.",
  },
];

const THEMES = {
  lab: {
    header: "from-blue-600 to-cyan-600",
    iconTile: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    border: "border-blue-100 hover:border-blue-200",
  },
  supplier: {
    header: "from-emerald-600 to-teal-600",
    iconTile: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    border: "border-emerald-100 hover:border-emerald-200",
  },
};

function AdvantageCard({
  theme,
  icon: HeaderIcon,
  title,
  items,
}: {
  theme: keyof typeof THEMES;
  icon: LucideIcon;
  title: string;
  items: Advantage[];
}) {
  const t = THEMES[theme];
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl md:rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-xl ${t.border}`}
    >
      <header className={`flex items-center gap-3 bg-gradient-to-r ${t.header} px-5 py-4 sm:px-6 sm:py-5 text-white`}>
        <span className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <HeaderIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold">{title}</h3>
      </header>
      <ul className="flex-1 divide-y divide-gray-100 px-3 py-2 sm:px-4">
        {items.map(({ icon: Icon, title: itemTitle, text }) => (
          <li key={text} className="group flex items-start gap-3 sm:gap-4 px-2 py-3 sm:py-4">
            <span
              className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${t.iconTile}`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <p className="text-sm sm:text-base leading-relaxed text-gray-600">
              {itemTitle ? (
                <>
                  <strong className="font-semibold text-gray-900">{itemTitle} :</strong> {text}
                </>
              ) : (
                <strong className="font-semibold text-gray-900">{text}</strong>
              )}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** "Pourquoi choisir" advantages, split between laboratories and suppliers. */
export default function WhyChooseDzLabmarket() {
  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:gap-8">
      <AdvantageCard theme="lab" icon={Microscope} title="Pour les laboratoires" items={LAB_ADVANTAGES} />
      <AdvantageCard theme="supplier" icon={Warehouse} title="Pour les fournisseurs" items={SUPPLIER_ADVANTAGES} />
    </div>
  );
}
