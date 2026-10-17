"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  HeartPulse,
  MapPin,
  FlaskConical,
  Microscope,
  User,
  Laptop,
  Smartphone,
  Lock,
  Users,
  Phone,
  Truck,
  ChevronDown,
  ShoppingCart,
  Package,
  Menu,
  X,
  ShoppingBag,
  Building2,
  Bell,
  MessageCircle,
  Mail,
  Send,
  CheckCircle,
  FolderTree,
  Eye,
} from "lucide-react";
import CartPanel from "@/components/CartPanel";
import UserDropdown from "@/components/UserDropdown";
import LoginAlert from "@/components/LoginAlert";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import {
  HomeDesktopNavMenus,
  HomeMobileNavMenus,
} from "@/components/HomeNavMenus";
import { getSessionRole, getAllProducts, PublicProduct, PublicCatalogItem, getPublicMachines, getPublicServices, NotificationData, createProblem, getProfile, ClientData, getPublicCategories, Category, refreshAuthToken } from "@/lib/api";
import { performLogout } from "@/lib/perform-logout";
import { setupNativeFcmBridge } from "@/lib/fcm-bridge";
import { useCart } from "@/contexts/CartContext";
import dynamic from "next/dynamic";
import { useNotificationFeed } from "@/hooks/useNotificationFeed";
import NotificationPanel, { RealtimeToast, type NotificationVisual } from "@/components/NotificationPanel";
import { showBrowserNotification } from "@/lib/browser-notification";
import WhyChooseDzLabmarket from "@/components/WhyChooseDzLabmarket";
import { getMediaUrl } from "@/lib/media-url";
import UniqueDataFields from "@/components/UniqueDataFields";
import SupplierNameGate from "@/components/SupplierNameGate";
import CatalogPrice from "@/components/CatalogPrice";
import CatalogLocationBanner from "@/components/CatalogLocationBanner";
import {
  getUniqueDataTitle,
  productToUniqueData,
} from "@/lib/unique-data-display";
import { useUserLocation } from "@/hooks/useUserLocation";
import { resolveWilayaCode } from "@/lib/algeria-wilayas";
import { toUserFacingError } from "@/lib/sanitize-error";
import {
  hasAuthSessionHint,
  markSessionInactive,
} from "@/lib/auth-session";

const HomeSponsoredHero = dynamic(
  () => import("@/components/HomeSponsoredHero"),
  { ssr: false, loading: () => null }
);
const PromotionsShowcase = dynamic(
  () => import("@/components/PromotionsShowcase"),
  { ssr: false, loading: () => null }
);
const GroupSelleShowcase = dynamic(
  () => import("@/components/GroupSelleShowcase"),
  { ssr: false, loading: () => null }
);
const CatalogItemDetailsModal = dynamic(
  () => import("@/components/CatalogItemDetailsModal"),
  { ssr: false }
);

/** Title-case in the DOM (avoids ALL-CAPS hydration rewrites by browsers/extensions). Use `uppercase` CSS where all-caps look is needed. */
const BRAND_NAME = "Dz Labmarket";

const HERO_HIGHLIGHTS = [
  { icon: Building2, title: "Multiples fournisseurs", text: "Agrégés sur une interface unique" },
  { icon: Truck, title: "Livraisons rapides", text: "Le meilleur délai en un coup d'œil" },
  { icon: Clock, title: "Réserve 24h/24", text: "Achetez en toute autonomie" },
  { icon: MapPin, title: "69 wilayas", text: "Visibilité nationale" },
];
export default function HomePage() {
  const router = useRouter();
  const { getTotalItems, addToCart } = useCart();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<ClientData | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [machines, setMachines] = useState<PublicCatalogItem[]>([]);
  const [services, setServices] = useState<PublicCatalogItem[]>([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const scrollProgressRef = useRef<HTMLDivElement>(null);
  const cartItemCount = getTotalItems();
  const isClientUser = userRole === "client";
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    toast,
    dismissToast,
  } = useNotificationFeed(isAuthenticated && isClientUser, {
    orderStatusUpdate: {
      handle: (payload) => {
        const message = (payload as { message?: string }).message || "";
        showBrowserNotification("Mise à jour de réserve", message);
        return { title: "Mise à jour de réserve", message, href: "/orders" };
      },
    },
    subscriptionRequestUpdate: {
      handle: (payload) => {
        const data = payload as { title?: string; message?: string };
        showBrowserNotification(data.title || "Abonnement", data.message || "");
        return { title: data.title || "Abonnement", message: data.message || "" };
      },
    },
  });
  const {
    location: userLocation,
    status: locationStatus,
    source: locationSource,
    requestBrowserLocation,
  } = useUserLocation();
  const requiresWilayaForCatalog = !isAuthenticated || userRole === "client";
  const visitorWilayaCode = resolveWilayaCode(userLocation?.wilaya);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [catalogDetails, setCatalogDetails] = useState<{
    item: PublicCatalogItem;
    kind: "machine" | "service";
  } | null>(null);
  const [supportFormData, setSupportFormData] = useState({
    email: "",
    phone: "",
    message: "",
  });
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Check authentication status and role before rendering guest/auth header
  useEffect(() => {
    const loadUserData = async () => {
      try {
        let session = await getSessionRole();

        // After login we full-reload; cookies can lag one tick. Retry with refresh.
        if (!session && hasAuthSessionHint()) {
          await refreshAuthToken().catch(() => null);
          session = await getSessionRole();
        }

        if (!session) {
          if (hasAuthSessionHint()) markSessionInactive();
          setIsAuthenticated(false);
          setUserRole(null);
          setUserData(null);
          setUserEmail("");
          return;
        }

        const role = session.role || null;
        setUserRole(role);

        // Home is for clients/guests — staff & suppliers belong on their dashboards.
        if (role === "admin" || role === "sou-admin") {
          router.replace("/dashboard");
          return;
        }
        if (role === "supplier") {
          router.replace("/dashboard-supplier");
          return;
        }

        if (role === "client") {
          setIsAuthenticated(true);
          setUserEmail(session.email || "");

          const profileResult = await getProfile();
          if (profileResult.success && profileResult.data) {
            setUserData(profileResult.data);
          }
        } else {
          setIsAuthenticated(false);
          setUserEmail("");
          setUserData(null);
        }
      } finally {
        setIsAuthReady(true);
      }
    };

    void loadUserData();
  }, [router]);

  // On logout: show full-page loading (not the Connexion button) until /home remounts.
  useEffect(() => {
    const onLogout = () => {
      setIsAuthReady(false);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserEmail("");
      setUserData(null);
      setShowNotifications(false);
      setMobileMenuOpen(false);
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  // Compact header + reading progress bar while scrolling.
  useEffect(() => {
    if (!isAuthReady) return;
    let frame = 0;
    // Hysteresis: shrink/expand at different offsets so header height
    // changes don't bounce scrollY across a single threshold.
    const scrolledRef = { current: false };
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const next = scrolledRef.current ? y > 10 : y > 56;
      if (next !== scrolledRef.current) {
        scrolledRef.current = next;
        setIsHeaderScrolled(next);
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollProgressRef.current) {
        scrollProgressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isAuthReady]);

  useEffect(() => {
    if (isClientUser) {
      router.prefetch("/orders");
    }
  }, [isClientUser, router]);

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const id = hash.slice(1);
      const tryScroll = (attempt = 0) => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempt < 20) {
          setTimeout(() => tryScroll(attempt + 1), 150);
        }
      };
      tryScroll();
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  // Wait for session + wilaya before fetching — skip while logout/session overlay is up
  // (in-flight fetches aborted by hard reload surface as noisy "Failed to fetch").
  useEffect(() => {
      if (!isAuthReady) {
        setIsLoadingProducts(true);
        setIsLoadingMachines(true);
        setIsLoadingServices(true);
        return;
      }

    let cancelled = false;

    const loadCatalog = async () => {
      const wilayaCode = resolveWilayaCode(userLocation?.wilaya);
      const hasWilaya = Boolean(wilayaCode || userLocation?.wilaya);

      // Prefer wilaya filter when we have it; never block the first DB fetch on geolocation.
      const canFilterByWilaya =
        requiresWilayaForCatalog &&
        locationStatus === "granted" &&
        hasWilaya;

      const filters = {
        ...(canFilterByWilaya
          ? wilayaCode
          ? { wilayaCode }
          : userLocation?.wilaya
            ? { wilayaCode: userLocation.wilaya }
              : {}
            : {}),
        limit: 8,
      };

      setIsLoadingProducts(true);
      setIsLoadingMachines(true);
      setIsLoadingServices(true);
      setProductsError(null);

      try {
        const [productsRes, machinesRes, servicesRes] = await Promise.all([
          getAllProducts({ ...filters, hasQuantity: true }),
          getPublicMachines(filters),
          getPublicServices(filters),
        ]);

        if (cancelled) return;

        if (productsRes.success && productsRes.data?.products) {
          const inStock = productsRes.data.products.filter((p) => p.quantity > 0);
          const outOfStock = productsRes.data.products.filter((p) => p.quantity === 0);
          setProducts([...inStock, ...outOfStock]);
          setProductsError(null);
        } else {
          setProductsError(
            toUserFacingError(
              productsRes.message,
              "Erreur lors du chargement des produits"
            )
          );
          setProducts([]);
        }

        if (machinesRes.success && machinesRes.data?.machines) {
          setMachines(machinesRes.data.machines);
        } else {
          setMachines([]);
        }

        if (servicesRes.success && servicesRes.data?.services) {
          setServices(servicesRes.data.services);
        } else {
          setServices([]);
        }
      } catch {
        if (cancelled) return;
        setProductsError("Erreur lors du chargement des produits");
        setProducts([]);
        setMachines([]);
        setServices([]);
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
          setIsLoadingMachines(false);
          setIsLoadingServices(false);
        }
      }
    };

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthReady,
    requiresWilayaForCatalog,
    userLocation?.wilaya,
    locationStatus,
  ]);

  // Categories are public — do not wait on auth (avoids empty section when session probe is slow).
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const result = await getPublicCategories();
        if (cancelled) return;
        if (result.success && result.data) {
          setCategories(result.data.categories || []);
        } else {
          setCategories([]);
        }
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setIsLoadingCategories(false);
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Register FCM token (mobile WebView)
  useEffect(() => {
    if (!(isAuthenticated && isClientUser)) return;
    return setupNativeFcmBridge({ enabled: true });
  }, [isAuthenticated, isClientUser]);

  const handleNotificationClick = (notification: NotificationData) => {
    setShowNotifications(false);
    markRead(notification._id);
    router.push("/orders");
  };

  const describeNotification = (notification: NotificationData): NotificationVisual => {
    if (notification.type === "order_status") {
      return {
        title: "Mise à jour de réserve",
        icon: <Truck className="w-5 h-5" />,
        iconClassName: "bg-gradient-to-br from-blue-600 to-cyan-600",
      };
    }
    if (notification.type === "new_order") {
      return {
        title: "Nouvelle réserve",
        icon: <ShoppingCart className="w-5 h-5" />,
        iconClassName: "bg-gradient-to-br from-green-600 to-emerald-600",
      };
    }
    return {
      title: notification.type === "subscription" ? "Abonnement" : "Notification système",
      icon: <Bell className="w-5 h-5" />,
      iconClassName: "bg-gradient-to-br from-gray-600 to-gray-700",
    };
  };

  // Handle support form submission
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError(null);
    setSupportSuccess(false);
    setIsSubmittingSupport(true);

    try {
      const result = await createProblem({
        email: supportFormData.email.trim(),
        phone: supportFormData.phone.trim(),
        message: supportFormData.message.trim(),
      });

      if (result.success) {
        setSupportSuccess(true);
        // Reset form but keep email and phone if user is authenticated
        setSupportFormData({
          email: isAuthenticated && userData ? (userData.email || "") : "",
          phone: isAuthenticated && userData ? (userData.phone || "") : "",
          message: "",
        });
        setTimeout(() => {
          setShowSupportModal(false);
          setSupportSuccess(false);
        }, 2000);
      } else {
        setSupportError(result.message || "Erreur lors de l'envoi du message");
      }
    } catch (err) {
      console.error("Support submit error:", err);
      setSupportError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // Prevent body scroll when support modal is open
  useEffect(() => {
    if (showSupportModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showSupportModal]);


  // Bind scroll animations once the main sections are in the DOM.
  useEffect(() => {
    if (!isAuthReady) return;

    const observerOptions = {
      threshold: 0.05,
      rootMargin: "0px 0px -40px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        if (id) {
          setVisibleElements((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }
        entry.target.classList.add("animate");
      });
    }, observerOptions);

    let observed: Element[] = [];
    const frame = window.requestAnimationFrame(() => {
      observed = Array.from(
        document.querySelectorAll(
          ".scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale"
        )
      );
      observed.forEach((el) => observer.observe(el));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [isAuthReady, products.length, machines.length, services.length, categories.length]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: `Qu'est-ce que ${BRAND_NAME} ?`,
      answer: `${BRAND_NAME} est une marketplace professionnelle qui connecte les laboratoires d'analyses avec leurs clients, facilitant la recherche, la réserve et le suivi des services d'analyse.`,
    },
    {
      question: `Comment fonctionne ${BRAND_NAME} ?`,
      answer: "Notre plateforme permet de rechercher des services précis, consulter les offres, réserver en ligne, payer en toute sécurité et suivre votre réserve en temps réel.",
    },
    {
      question: "Puis-je annuler ma réserve ?",
      answer: "Oui, vous pouvez annuler votre réserve dans un délai de 24 heures après la passation, sous réserve des conditions générales de vente.",
    },
    {
      question: "Quel est le délai de livraison ?",
      answer: "Les délais de livraison varient selon le type d'analyse demandé. Ils sont indiqués clairement sur chaque fiche produit avant la réserve.",
    },
    {
      question: "Comment puis-je contacter le support ?",
      answer: "Vous pouvez nous contacter via la page Contact, par email à dzmarketLab@gmail.com ou par téléphone au 0781079959 (Blida).",
    },
  ];

  const benefits = [
    {
      icon: Microscope,
      title: "Laboratoires et fournisseurs certifiés",
      description: "Tous nos partenaires sont certifiés et vérifiés",
    },
    {
      icon: Laptop,
      title: "Accès en ligne",
      description: "Gérez vos réserves depuis n'importe où",
    },
    {
      icon: Smartphone,
      title: "Application mobile",
      description: "Disponible sur iOS et Android",
    },
    {
      icon: Lock,
      title: "Paiement sécurisé",
      description: "Transactions protégées et cryptées",
    },
    {
      icon: Users,
      title: "Support dédié",
      description: "Une équipe à votre écoute 7j/7",
    },
    {
      icon: Phone,
      title: "Assistance téléphonique",
      description: "Hotline disponible du lundi au vendredi",
    },
  ];


  // Early-return the same shell as `loading.tsx` until session resolves.
  // Do not render header alongside the loader — that mismatches Suspense fallback HTML.
  if (!isAuthReady) {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
        <AppLoadingScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-clip">
      {/* Header - Professional & Modern */}
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 animate-header-in ${
          isHeaderScrolled
            ? "bg-white/80 border-gray-200/70 shadow-lg shadow-blue-950/5"
            : "bg-white/95 border-gray-100 shadow-sm"
        }`}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/home" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group">
              <div className="transform transition-all duration-300 group-hover:scale-105">
                <Image
                  src="/images/logo.png"
                  alt={`${BRAND_NAME} Logo`}
                  width={274}
                  height={200}
                  className="h-10 sm:h-11 md:h-14 lg:h-16 w-auto object-contain"
                  priority
                />
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-5 lg:gap-8 xl:gap-10">
              <a href="#accueil" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Accueil
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              {!isAuthenticated && (
              <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                À propos
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              )}
              <HomeDesktopNavMenus showSuppliers={isAuthenticated} promotionAlert={isAuthenticated} />
              {!isAuthenticated && (
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Contact
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              )}
              {isAuthenticated && isClientUser && (
                <>
                  <Link href="/statistics" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group flex items-center gap-2">
                    <span>Statistiques</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                <Link href="/orders" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Mes Réserves</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {isAuthenticated && isClientUser ? (
                <>
                  {/* Notifications */}
                  <div className="relative">
                    <button
                      ref={bellRef}
                      type="button"
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl active:bg-gray-100 sm:hover:bg-gray-100 transition-colors group"
                      aria-label="Notifications"
                      aria-expanded={showNotifications}
                    >
                      <Bell className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    <NotificationPanel
                      open={showNotifications}
                      onClose={() => setShowNotifications(false)}
                      anchorRef={bellRef}
                      notifications={notifications}
                      unreadCount={unreadCount}
                      onMarkAllRead={() => void markAllRead().catch(() => {})}
                      onItemClick={handleNotificationClick}
                      describe={describeNotification}
                      theme="blue"
                      showSender
                    />
                    <RealtimeToast
                      toast={toast}
                      onDismiss={dismissToast}
                      onOpen={(t) => {
                        if (t.href) router.push(t.href);
                      }}
                      theme="blue"
                      mobileBottomClassName="bottom-20"
                    />
                  </div>

                  {/* Shopping Cart Icon */}
                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl active:bg-gray-100 sm:hover:bg-gray-100 transition-colors group"
                    aria-label="Panier"
                  >
                    <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {cartItemCount}
                      </span>
                    )}
                  </button>
                  
                  {/* User Dropdown */}
                  <UserDropdown userEmail={userEmail} />
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md active:opacity-90 sm:px-6 sm:py-2.5 sm:text-sm md:px-8 md:py-3 md:text-base"
                >
                  <span>Connexion</span>
                  <svg className="hidden sm:block w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-700 active:bg-gray-100"
                aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-gray-200 animate-fade-in max-h-[min(70svh,28rem)] overflow-y-auto">
              <div className="flex flex-col gap-1">
                <a href="#accueil" onClick={() => setMobileMenuOpen(false)} className="min-h-11 flex items-center text-gray-700 active:text-blue-600 font-medium px-1">
                  Accueil
                </a>
                {!isAuthenticated && (
                <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="min-h-11 flex items-center text-gray-700 active:text-blue-600 font-medium px-1">
                  À propos
                </Link>
                )}
                <HomeMobileNavMenus
                  onNavigate={() => setMobileMenuOpen(false)}
                  showSuppliers={isAuthenticated}
                  promotionAlert={isAuthenticated}
                />
                {!isAuthenticated && (
                <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="min-h-11 flex items-center text-gray-700 active:text-blue-600 font-medium px-1">
                  Contact
                </Link>
                )}
                {isAuthenticated && isClientUser && (
                  <>
                    <Link href="/statistics" onClick={() => setMobileMenuOpen(false)} className="min-h-11 flex items-center text-gray-700 active:text-blue-600 font-medium px-1">
                      Statistiques
                    </Link>
                  <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="min-h-11 flex items-center gap-2 text-gray-700 active:text-blue-600 font-medium px-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Mes Réserves</span>
                  </Link>
                  </>
                )}
                {isAuthenticated && isClientUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="mt-2 min-h-12 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold active:bg-blue-700 text-center flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Panier
                    </button>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="min-h-12 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold active:bg-gray-200 text-center flex items-center justify-center"
                    >
                      Mon profil
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuthReady(false);
                        setMobileMenuOpen(false);
                        void performLogout(router, { clearCart: true, redirectTo: "/home" });
                      }}
                      className="min-h-12 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold active:bg-red-700 text-center"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 min-h-12 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-center flex items-center justify-center"
                  >
                    Connexion
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>
        <div
          ref={scrollProgressRef}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400"
          style={{ transform: "scaleX(0)" }}
        />
      </header>

      <HomeSponsoredHero />

      {/* Hero Section — phone-first, full-bleed lab cover */}
      <section
        id="accueil"
        className="relative isolate flex min-h-[min(72svh,560px)] sm:min-h-[calc(100svh-4rem)] md:min-h-[calc(100svh-5rem)] flex-col overflow-hidden bg-slate-950"
      >
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src="/labocover.jpeg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_35%] sm:object-[center_40%] animate-hero-cover-kenburns will-change-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-sky-950/60 to-slate-950/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(56,189,248,0.2)_0%,transparent_55%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-slate-950/80 to-transparent" />
        </div>

        <div className="container relative mx-auto max-w-5xl flex flex-1 flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-7 pb-5 sm:pt-14 md:pt-16 text-center">
          <div className="mb-3.5 sm:mb-6 rounded-2xl border border-white/25 bg-white/95 px-4 py-2.5 sm:px-6 sm:py-4 shadow-2xl shadow-slate-950/40 backdrop-blur-md">
            <Image
              src="/logo.png"
              alt={`${BRAND_NAME} Logo`}
              width={220}
              height={120}
              className="h-11 sm:h-16 w-auto max-w-[170px] sm:max-w-[220px] object-contain"
              priority
            />
          </div>

          <span className="inline-flex max-w-[92%] items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-white backdrop-blur-md animate-fade-in-up animation-delay-200">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="truncate">Plateforme B2B — biologie médicale</span>
          </span>

          <h1 className="mt-3.5 sm:mt-6 max-w-4xl text-[1.4rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] text-white animate-fade-in-up animation-delay-200 px-1">
            L&apos;approvisionnement de votre laboratoire,{" "}
            <span className="text-cyan-100">simple et rapide.</span>
          </h1>

          <p className="mt-3 sm:mt-6 max-w-2xl mx-auto text-sm sm:text-lg leading-relaxed text-white/85 animate-fade-in-up animation-delay-400 line-clamp-3 sm:line-clamp-none">
            {BRAND_NAME} centralise réactifs, consommables et équipements&nbsp;: comparez,
            réservez et suivez vos livraisons partout en Algérie.
          </p>

          <div className="mt-5 sm:mt-9 flex w-full max-w-md sm:max-w-none flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-4 animate-fade-in-up animation-delay-600">
            <Link
              href="/allthings"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm sm:text-base font-semibold text-blue-700 shadow-lg shadow-blue-950/20 transition-colors active:bg-blue-50 sm:hover:bg-blue-50"
            >
              Découvrir la marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/50 bg-white/15 px-5 py-3.5 text-sm sm:text-base font-semibold text-white backdrop-blur-md transition-colors active:bg-white/25 sm:hover:bg-white/25"
            >
              En savoir plus
            </Link>
          </div>

          <div className="mt-6 sm:mt-10 hidden sm:flex items-center justify-center gap-4 animate-fade-in-up animation-delay-800">
            <div className="flex -space-x-3">
              {[FlaskConical, Microscope, Truck].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-blue-700 shadow-md"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              ))}
            </div>
            <div className="text-sm leading-snug text-left">
              <p className="font-semibold text-white">Fournisseurs vérifiés</p>
              <p className="text-white/70">Réactifs, consommables et équipements</p>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute right-6 sm:right-10 top-[58%] z-20 hidden lg:block animate-float"
          style={{ animationDelay: "1.2s" }}
        >
          <div className="w-60 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-slate-900/20 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                <HeartPulse className="h-4 w-4" />
              </span>
              <div className="leading-tight text-left">
                <p className="text-sm font-semibold text-slate-900">Stock en temps réel</p>
                <p className="text-[11px] text-slate-500">Disponibilité actualisée</p>
              </div>
            </div>
            <svg viewBox="0 0 200 40" fill="none" className="mt-2 h-8 w-full text-sky-500" aria-hidden>
              <path
                d="M0 22 H56 L62 22 L68 10 L76 34 L84 4 L92 28 L98 22 H200"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="animate-hero-ecg"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4 animate-fade-in-up animation-delay-800">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HERO_HIGHLIGHTS.map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="flex shrink-0 items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow-md ring-1 ring-black/5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">{title}</span>
              </div>
            ))}
          </div>

          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] items-center gap-4 sm:gap-6 rounded-2xl bg-white p-4 sm:p-5 shadow-2xl shadow-black/20 ring-1 ring-black/5">
            {HERO_HIGHLIGHTS.map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className={`flex items-center gap-3 min-w-0 ${i > 0 ? "lg:border-l lg:border-gray-200 lg:pl-6" : ""}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="truncate text-xs text-gray-500">{text}</p>
                </div>
              </div>
            ))}
            <Link
              href="/about"
              className="col-span-2 lg:col-span-1 group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-md"
            >
              En savoir plus
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div aria-hidden className="pointer-events-none relative -mb-px h-8 sm:h-16 md:h-20 w-full text-white">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <path d="M0 48 C240 8 480 72 720 40 C960 8 1200 56 1440 24 L1440 80 L0 80 Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-8 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-block px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3">
              Explorer
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
              Nos catégories
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Parcourez nos catégories produits, machines et services
            </p>
          </div>

          {isLoadingCategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl sm:rounded-2xl bg-gray-100 aspect-square" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-gray-300">
              <FolderTree className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Aucune catégorie disponible pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-6">
              {categories.map((cat) => {
                const catImage = getMediaUrl(cat.image);
                const type = cat.type_catgory || "product";
                const typeLabel =
                  type === "machine" ? "Machine" : type === "services" ? "Service" : "Produit";
                const typeClass =
                  type === "machine"
                    ? "bg-blue-100 text-blue-700"
                    : type === "services"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-700";
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.id}`}
                    className="group overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 sm:hover:shadow-xl sm:hover:border-blue-200"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {catImage ? (
                        <img
                          src={catImage}
                          alt={cat.name_catgory}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "/icon.png";
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FolderTree className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <span
                        className={`absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${typeClass}`}
                      >
                        {typeLabel}
                      </span>
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
                        <h3 className="font-bold text-white text-xs sm:text-base line-clamp-2">
                          {cat.name_catgory}
                        </h3>
                        {cat.sousCategories.length > 0 && (
                          <p className="hidden sm:block text-xs text-white/80 mt-1">
                            {cat.sousCategories.length} sous-catégorie
                            {cat.sousCategories.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:block p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{cat.des}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about-section" className="py-8 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className={`text-center mb-8 sm:mb-10 md:mb-14 scroll-animate ${visibleElements.has("about-left") ? "animate" : ""}`} id="about-left">
              <div className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-50 text-blue-600 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4">
                À propos
              </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-tight px-2">
              Pourquoi choisir <span className="text-blue-600">{BRAND_NAME}</span> ?
              </h2>
                  </div>

          <div className={`scroll-animate-scale ${visibleElements.has("about-right") ? "animate" : ""}`} id="about-right">
            <WhyChooseDzLabmarket />
            </div>

          <div className="mt-8 sm:mt-10 text-center">
              <Link
              href="/about"
              className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-sm sm:text-base md:text-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl inline-flex items-center gap-2"
              >
              <span>En savoir plus</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              </Link>
          </div>
        </div>
      </section>

      <PromotionsShowcase />

      <GroupSelleShowcase />

      {/* FAQ Section */}
      <section className="py-8 sm:py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-3 sm:mb-4">
              <div className="inline-block px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3">
                Aide
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 text-center mb-3 sm:mb-4 md:mb-6 px-2 sm:px-4">
              Foire Aux Questions
            </h2>
            <div className="text-center mb-6 sm:mb-8 md:mb-12">
              <button className="px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all transform hover:scale-105 text-xs sm:text-sm md:text-base">
                Voir toutes les questions
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg sm:rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-semibold text-sm sm:text-base text-gray-900 pr-2">{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transform transition-transform flex-shrink-0 ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="px-4 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm md:text-base text-gray-700 animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Products Section — phone 2-col app cards */}
      <section id="marketplace" className="py-8 sm:py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {requiresWilayaForCatalog && (
            <CatalogLocationBanner
              isGuest={!isAuthenticated}
              locationStatus={locationStatus}
              wilayaLabel={userLocation?.wilaya}
              source={locationSource}
              onRequestLocation={requestBrowserLocation}
              catalogLabel="produits, machines et services"
            />
          )}
          <div className="flex items-center justify-between mb-5 sm:mb-8 md:mb-12 gap-3">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Produits populaires
            </h2>
            <Link
              href="/products"
              className="shrink-0 min-h-10 inline-flex items-center justify-center px-3.5 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-full font-medium active:bg-blue-700 sm:hover:bg-blue-700 text-xs sm:text-sm md:text-base"
            >
              Voir tout
            </Link>
          </div>
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-6 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="aspect-square bg-gray-200 rounded-lg sm:rounded-xl mb-2 sm:mb-4" />
                  <div className="h-3 sm:h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 sm:h-6 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : productsError ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Erreur lors du chargement</p>
              <p className="text-sm text-gray-500">{productsError}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {requiresWilayaForCatalog &&
                locationStatus === "loading" &&
                !visitorWilayaCode
                  ? "En attente de votre localisation..."
                  : "Aucun produit disponible pour le moment"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              {products.map((product, index) => {
                const uniqueData = productToUniqueData(product);
                const displayName = getUniqueDataTitle(uniqueData, product.name);
                const mainImage =
                  product.images && product.images.length > 0
                    ? getMediaUrl(product.images[0])
                    : null;

                return (
                  <div
                    key={product.id}
                    id={`product-${index}`}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-200 overflow-hidden sm:hover:shadow-2xl transition-shadow duration-300 group flex flex-col"
                    style={{
                      transitionDelay: `${index * 50}ms`,
                      ...(visibleElements.has(`product-${index}`)
                        ? { opacity: 1, transform: "scale(1)" }
                        : {}),
                    }}
                  >
                    <Link
                      href={`/products/${product.id}`}
                      className="relative aspect-square sm:h-48 sm:aspect-auto bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden"
                    >
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={displayName}
                          className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "/icon.png";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FlaskConical className="w-10 h-10 sm:w-16 sm:h-16 text-gray-400" />
                        </div>
                      )}
                      <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-700">
                        Produit
                      </span>
                      {product.quantity === 0 && (
                        <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-3 sm:py-1 bg-red-500 text-white rounded-full text-[10px] sm:text-xs font-semibold">
                          Rupture
                        </span>
                      )}
                    </Link>

                    <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                      <Link href={`/products/${product.id}`}>
                        <h3 className="text-sm sm:text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600">
                          {displayName}
                        </h3>
                      </Link>

                      {product.supplier && (
                        <div className="hidden sm:block">
                          <SupplierNameGate visible={Boolean(userRole)}>
                            <Link
                              href={`/supplier/${product.supplier.id}`}
                              className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                            >
                              <Building2 className="w-4 h-4 shrink-0" />
                              <span className="truncate hover:underline">
                                {product.supplier.name}
                              </span>
                              {product.supplier.certife && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                                  Certifie
                                </span>
                              )}
                            </Link>
                          </SupplierNameGate>
                        </div>
                      )}

                      <div className="hidden sm:block">
                        <UniqueDataFields
                          data={uniqueData}
                          max={8}
                          guestOnly={!userRole}
                          hidePrices={!userRole}
                        />
                      </div>
                      <CatalogPrice
                        amount={product.price}
                        visible={Boolean(userRole)}
                        className="text-base sm:text-xl font-bold text-blue-600"
                      />

                      <div className="mt-auto flex gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isClientUser) {
                              addToCart({
                                id: product.id,
                                name: displayName,
                                price: product.price,
                                supplierId: product.supplier?.id || "",
                              });
                              setCartOpen(true);
                            } else {
                              setLoginAlertOpen(true);
                            }
                          }}
                          disabled={product.quantity === 0}
                          className="flex-1 min-h-10 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold active:opacity-90 sm:hover:from-blue-700 sm:hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {product.quantity === 0 ? "Rupture" : "Ajouter"}
                        </button>
                        <Link
                          href={`/products/${product.id}`}
                          className="hidden sm:inline-flex px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 items-center justify-center"
                        >
                          Voir
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Machines Section */}
      <section id="machines" className="py-8 sm:py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-5 sm:mb-8 md:mb-12 gap-3">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Machines
            </h2>
            <Link
              href="/machines"
              className="shrink-0 min-h-10 inline-flex items-center justify-center px-3.5 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-full font-medium active:bg-blue-700 sm:hover:bg-blue-700 text-xs sm:text-sm md:text-base"
            >
              Voir tout
            </Link>
          </div>
          {isLoadingMachines ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-6 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="aspect-square bg-gray-200 rounded-lg sm:rounded-xl mb-2 sm:mb-4"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded mb-2"></div>
                </div>
              ))}
            </div>
          ) : machines.length === 0 ? (
            <div className="text-center py-12">
              <Microscope className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {requiresWilayaForCatalog &&
                locationStatus === "loading" &&
                !visitorWilayaCode
                  ? "En attente de votre localisation..."
                    : "Aucune machine disponible pour le moment"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              {machines.map((machine) => {
                const uniqueData = machine.unique_data || {};
                const displayName = getUniqueDataTitle(uniqueData, machine.name);
                const mainImage =
                  machine.images && machine.images.length > 0
                    ? getMediaUrl(machine.images[0])
                    : null;
                return (
                  <div
                    key={machine.id}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-200 overflow-hidden sm:hover:shadow-2xl transition-shadow duration-300 group flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCatalogDetails({ item: machine, kind: "machine" })
                      }
                      className="relative aspect-square sm:h-48 sm:aspect-auto bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden text-left"
                    >
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={displayName}
                          className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "/icon.png";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Microscope className="w-10 h-10 sm:w-16 sm:h-16 text-gray-400" />
                        </div>
                      )}
                      <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700">
                        Machine
                      </span>
                    </button>
                    <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                      <button
                        type="button"
                        onClick={() =>
                          setCatalogDetails({ item: machine, kind: "machine" })
                        }
                        className="text-left"
                      >
                        <h3 className="text-sm sm:text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600">
                          {displayName}
                        </h3>
                      </button>
                      <div className="hidden sm:block">
                        <UniqueDataFields
                          data={uniqueData}
                          max={8}
                          guestOnly={!userRole}
                          hidePrices={!userRole}
                        />
                      </div>
                      <CatalogPrice
                        amount={machine.price}
                        visible={Boolean(userRole)}
                        className="text-base sm:text-xl font-bold text-blue-600"
                      />
                      <div className="mt-auto flex gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isClientUser) {
                              addToCart({
                                id: machine.id,
                                name: displayName,
                                price: machine.price,
                                supplierId: machine.supplier?.id || "",
                                itemType: "machine",
                              });
                              setCartOpen(true);
                            } else {
                              setLoginAlertOpen(true);
                            }
                          }}
                          disabled={machine.quantity === 0}
                          className="flex-1 min-h-10 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold active:opacity-90 sm:hover:from-blue-700 sm:hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {machine.quantity === 0 ? "Rupture" : "Réserver"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCatalogDetails({ item: machine, kind: "machine" })
                          }
                          className="hidden sm:flex px-4 py-2.5 border-2 border-blue-600 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 items-center justify-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Détails
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-8 sm:py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-5 sm:mb-8 md:mb-12 gap-3">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Services
            </h2>
            <Link
              href="/services"
              className="shrink-0 min-h-10 inline-flex items-center justify-center px-3.5 py-2 sm:px-6 sm:py-3 bg-amber-600 text-white rounded-full font-medium active:bg-amber-700 sm:hover:bg-amber-700 text-xs sm:text-sm md:text-base"
            >
              Voir tout
            </Link>
          </div>
          {isLoadingServices ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-6 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="aspect-square bg-gray-200 rounded-lg sm:rounded-xl mb-2 sm:mb-4"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded mb-2"></div>
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <Laptop className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {requiresWilayaForCatalog &&
                locationStatus === "loading" &&
                !visitorWilayaCode
                  ? "En attente de votre localisation..."
                    : "Aucun service disponible pour le moment"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              {services.map((service) => {
                const uniqueData = service.unique_data || {};
                const displayName = getUniqueDataTitle(uniqueData, service.name);
                const mainImage =
                  service.images && service.images.length > 0
                    ? getMediaUrl(service.images[0])
                    : null;
                return (
                  <div
                    key={service.id}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-200 overflow-hidden sm:hover:shadow-2xl transition-shadow duration-300 group flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCatalogDetails({ item: service, kind: "service" })
                      }
                      className="relative aspect-square sm:h-48 sm:aspect-auto bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden text-left"
                    >
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={displayName}
                          className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "/icon.png";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Laptop className="w-10 h-10 sm:w-16 sm:h-16 text-gray-400" />
                        </div>
                      )}
                      <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-800">
                        Service
                      </span>
                    </button>
                    <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                      <button
                        type="button"
                        onClick={() =>
                          setCatalogDetails({ item: service, kind: "service" })
                        }
                        className="text-left"
                      >
                        <h3 className="text-sm sm:text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-amber-700">
                          {displayName}
                        </h3>
                      </button>
                      <div className="hidden sm:block">
                        <UniqueDataFields
                          data={uniqueData}
                          max={8}
                          guestOnly={!userRole}
                          hidePrices={!userRole}
                        />
                      </div>
                      <CatalogPrice
                        amount={service.price}
                        visible={Boolean(userRole)}
                        className="text-base sm:text-xl font-bold text-amber-700"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCatalogDetails({ item: service, kind: "service" })
                        }
                        className="mt-auto w-full min-h-10 py-2 sm:py-2.5 border-2 border-amber-600 text-amber-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold active:bg-amber-50 sm:hover:bg-amber-50 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Détails
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Section - Professional */}
      <section className="py-8 sm:py-16 md:py-24 lg:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-6 sm:mb-12 md:mb-16 lg:mb-20">
            <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-blue-50 text-blue-600 rounded-full text-xs md:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4 md:mb-6">
              Avantages
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3 sm:mb-4">
              Pourquoi choisir <span className="text-blue-600">{BRAND_NAME}</span> ?
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2 sm:px-4">
              Des solutions professionnelles pour tous vos besoins d&apos;analyse
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4 md:gap-6">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 text-center border border-gray-100 sm:hover:shadow-2xl sm:hover:border-blue-200 transition-shadow duration-300 group"
                >
                  <div className="mb-3 sm:mb-4 md:mb-6 inline-block">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5 sm:mb-2 md:mb-3 text-xs sm:text-sm md:text-base lg:text-lg">{benefit.title}</h3>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-600 leading-relaxed line-clamp-3 sm:line-clamp-none">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer — compact on phone, clears bottom tab bar via body --lab-nav-offset */}
      <footer id="contact" className="bg-gray-900 text-white py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm mb-3 sm:mb-4">
                <Image
                  src="/images/logo.png"
                  alt={`${BRAND_NAME} Logo`}
                  width={120}
                  height={88}
                  className="h-9 sm:h-12 w-auto object-contain"
                />
              </div>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                La marketplace professionnelle des laboratoires d&apos;analyses
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2.5 sm:mb-4 text-sm sm:text-base">Navigation</h3>
              <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#accueil" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Accueil</a></li>
                <li><Link href="/about" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">À propos</Link></li>
                <li><Link href="/allthings" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Catalogue</Link></li>
                <li><Link href="/products" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Produits</Link></li>
                <li><Link href="/machines" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Machines</Link></li>
                <li><Link href="/services" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Services</Link></li>
                <li><Link href="/contact" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2.5 sm:mb-4 text-sm sm:text-base">Légal</h3>
              <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Mentions légales</a></li>
                <li><a href="#" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Confidentialité</a></li>
                <li><a href="#" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">CGV</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-semibold mb-2.5 sm:mb-4 text-sm sm:text-base">Support</h3>
              <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><Link href="/contact" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">Nous contacter</Link></li>
                <li><a href="mailto:dzmarketLab@gmail.com" className="inline-flex min-h-8 items-center break-all active:text-white sm:hover:text-white">dzmarketLab@gmail.com</a></li>
                <li><a href="tel:+213781079959" className="inline-flex min-h-8 items-center active:text-white sm:hover:text-white">0781079959</a></li>
                <li className="text-gray-500">Blida, Algérie</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-gray-400 text-xs sm:text-sm">
            <p>© {new Date().getFullYear()} {BRAND_NAME}. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Support Button - Fixed Bottom Right */}
      <button
        onClick={() => {
          // Pre-fill form with user data if authenticated
          if (isAuthenticated && userData) {
            setSupportFormData({
              email: userData.email || "",
              phone: userData.phone || "",
              message: "",
            });
          } else {
            setSupportFormData({
              email: "",
              phone: "",
              message: "",
            });
          }
          setShowSupportModal(true);
        }}
        className="fixed bottom-[calc(1rem+var(--lab-nav-offset,0px))] right-4 sm:bottom-[calc(1.5rem+var(--lab-nav-offset,0px))] sm:right-6 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-110"
        aria-label="Contacter le support"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {catalogDetails && (
        <CatalogItemDetailsModal
          item={catalogDetails.item}
          kind={catalogDetails.kind}
          onClose={() => setCatalogDetails(null)}
          onReserved={() => setCartOpen(true)}
        />
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
            onClick={() => setShowSupportModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all animate-fade-in-up border border-gray-200">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg sm:rounded-xl">
                      <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Contactez le support</h3>
                  </div>
                  <button
                    onClick={() => setShowSupportModal(false)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSupportSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {supportError && (
                  <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
                    {supportError}
                  </div>
                )}

                {supportSuccess && (
                  <div className="p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    Message envoyé avec succès !
                  </div>
                )}

                {/* Phone Field */}
                <div>
                  <label htmlFor="support-phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Numéro de téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                      id="support-phone"
                      type="tel"
                      required
                      readOnly={isAuthenticated && userData !== null}
                      disabled={isAuthenticated && userData !== null}
                      value={supportFormData.phone}
                      onChange={(e) => setSupportFormData({ ...supportFormData, phone: e.target.value })}
                      className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                        isAuthenticated && userData ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="support-email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                      id="support-email"
                      type="email"
                      required
                      readOnly={isAuthenticated && userData !== null}
                      disabled={isAuthenticated && userData !== null}
                      value={supportFormData.email}
                      onChange={(e) => setSupportFormData({ ...supportFormData, email: e.target.value })}
                      className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                        isAuthenticated && userData ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="support-message" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="support-message"
                    required
                    rows={4}
                    value={supportFormData.message}
                    onChange={(e) => setSupportFormData({ ...supportFormData, message: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Décrivez votre problème ou votre question..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmittingSupport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmittingSupport ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Envoyer</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Cart Panel */}
      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}

