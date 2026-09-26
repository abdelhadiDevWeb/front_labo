"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ShoppingBag, ShoppingCart, X } from "lucide-react";
import CartPanel from "@/components/CartPanel";
import UserDropdown from "@/components/UserDropdown";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import {
  HomeDesktopNavMenus,
  HomeMobileNavMenus,
} from "@/components/HomeNavMenus";
import { getSessionRole } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { performLogout } from "@/lib/perform-logout";

const BRAND_NAME = "Dz Labmarket";

type PublicSiteShellProps = {
  children: ReactNode;
};

/**
 * Same header + footer as the home page (auth-aware nav, cart, login).
 */
export function PublicSiteShell({ children }: PublicSiteShellProps) {
  const router = useRouter();
  const { getTotalItems } = useCart();
  const cartItemCount = getTotalItems();

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  const isClientUser = userRole === "client";

  useEffect(() => {
    setFooterYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getSessionRole();
        if (!session) {
          setIsAuthenticated(false);
          setUserRole(null);
          setUserEmail("");
          return;
        }
        const role = session.role || null;
        setUserRole(role);
        if (role === "client") {
          setIsAuthenticated(true);
          setUserEmail(session.email || "");
        } else {
          setIsAuthenticated(false);
          setUserEmail("");
        }
      } finally {
        setIsAuthReady(true);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const onLogout = () => {
      setIsAuthReady(false);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserEmail("");
      setMobileMenuOpen(false);
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const navLinkClass =
    "text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group";
  const navUnderline =
    "absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full";

  // Same shell as route `loading.tsx` until session resolves — avoids hydration mismatch.
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-white overflow-x-hidden flex flex-col">
        <AppLoadingScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-28">
            <Link href="/home" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group">
              <div className="transform transition-all duration-300 group-hover:scale-105">
                <Image
                  src="/images/logo.jpeg"
                  alt={`${BRAND_NAME} Logo`}
                  width={280}
                  height={140}
                  className="h-14 sm:h-16 md:h-20 lg:h-24 w-auto object-contain rounded-xl"
                  priority
                />
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              <Link href="/home" className={navLinkClass}>
                Accueil
                <span className={navUnderline} />
              </Link>
              <Link href="/about" className={navLinkClass}>
                À propos
                <span className={navUnderline} />
              </Link>
              <HomeDesktopNavMenus showSuppliers={isAuthenticated} />
              <Link href="/contact" className={navLinkClass}>
                Contact
                <span className={navUnderline} />
              </Link>
              {isAuthenticated && isClientUser && (
                <Link
                  href="/orders"
                  className={`${navLinkClass} flex items-center gap-2`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Mes Réserves</span>
                  <span className={navUnderline} />
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && isClientUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors group"
                    aria-label="Panier"
                  >
                    <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </button>
                  <UserDropdown userEmail={userEmail} />
                </>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex px-6 md:px-8 py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl items-center gap-2 text-sm md:text-base"
                >
                  <span>Connexion</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col gap-4">
                <Link
                  href="/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
                >
                  Accueil
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
                >
                  À propos
                </Link>
                <HomeMobileNavMenus
                  onNavigate={() => setMobileMenuOpen(false)}
                  showSuppliers={isAuthenticated}
                />
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
                >
                  Contact
                </Link>
                {isAuthenticated && isClientUser && (
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Mes Réserves</span>
                  </Link>
                )}
                {isAuthenticated && isClientUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 text-center flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Panier
                    </button>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 text-center"
                    >
                      Mon profil
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuthReady(false);
                        setMobileMenuOpen(false);
                        void performLogout(router, {
                          clearCart: true,
                          redirectTo: "/home",
                        });
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all duration-300 text-center"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 text-center"
                  >
                    Connexion
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-gray-900 text-white py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Image
                  style={{ borderRadius: "8px" }}
                  src="/images/logo.jpeg"
                  alt={`${BRAND_NAME} Logo`}
                  width={120}
                  height={120}
                  className="h-10 sm:h-12 w-auto object-contain rounded-lg"
                />
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                La marketplace professionnelle des laboratoires d&apos;analyses
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">
                Navigation
              </h3>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li>
                  <Link href="/home" className="hover:text-white transition-colors">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    À propos
                  </Link>
                </li>
                <li>
                  <Link href="/allthings" className="hover:text-white transition-colors">
                    Catalogue
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="hover:text-white transition-colors">
                    Produits
                  </Link>
                </li>
                <li>
                  <Link href="/machines" className="hover:text-white transition-colors">
                    Machines
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:text-white transition-colors">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">
                Légal
              </h3>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Politique de confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Conditions générales de vente
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">
                Support
              </h3>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    À propos
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Nous contacter
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:dzmarketLab@gmail.com"
                    className="hover:text-white transition-colors"
                  >
                    dzmarketLab@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+213781079959"
                    className="hover:text-white transition-colors"
                  >
                    0781079959
                  </a>
                </li>
                <li className="text-gray-500">Blida, Algérie</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-gray-400 text-xs sm:text-sm">
            <p>
              © {footerYear ?? ""} {BRAND_NAME}. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

export default PublicSiteShell;
