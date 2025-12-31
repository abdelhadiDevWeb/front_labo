"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FlaskConical,
  Microscope,
  User,
  Laptop,
  Smartphone,
  Lock,
  Users,
  Phone,
  Truck,
  Heart,
  Check,
  ChevronDown,
  Search,
  FileText,
  ShoppingCart,
  CreditCard,
  Package,
  Menu,
  X,
} from "lucide-react";
import CartPanel from "@/components/CartPanel";
import UserDropdown from "@/components/UserDropdown";
import { getAuthToken } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";

export default function HomePage() {
  const { getTotalItems, addToCart } = useCart();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const cartItemCount = getTotalItems();
  const [particles, setParticles] = useState<Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    animationDelay: number;
    animationDuration: number;
  }>>([]);

  // Check authentication status
  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(!!token);
    
    // Try to get user email from token (basic implementation)
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.email || "");
      } catch {
        // If token parsing fails, just show authenticated state
      }
    }
  }, []);


  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleElements((prev) => new Set(prev).add(entry.target.id));
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll(".scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  useEffect(() => {
    // Generate particles only on client side to avoid hydration mismatch
    const generatedParticles = Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      width: Math.random() * 20 + 10,
      height: Math.random() * 20 + 10,
      animationDelay: Math.random() * 5,
      animationDuration: Math.random() * 10 + 10,
    }));
    setParticles(generatedParticles);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "Qu'est-ce que MarketLab ?",
      answer: "MarketLab est une marketplace professionnelle qui connecte les laboratoires d'analyses avec leurs clients, facilitant la recherche, la commande et le suivi des services d'analyse.",
    },
    {
      question: "Comment fonctionne MarketLab ?",
      answer: "Notre plateforme permet de rechercher des services précis, consulter les offres, commander en ligne, payer en toute sécurité et suivre votre commande en temps réel.",
    },
    {
      question: "Puis-je annuler ma commande ?",
      answer: "Oui, vous pouvez annuler votre commande dans un délai de 24 heures après la passation, sous réserve des conditions générales de vente.",
    },
    {
      question: "Quel est le délai de livraison ?",
      answer: "Les délais de livraison varient selon le type d'analyse demandé. Ils sont indiqués clairement sur chaque fiche produit avant la commande.",
    },
    {
      question: "Comment puis-je contacter le support ?",
      answer: "Vous pouvez nous contacter via le formulaire de contact sur notre site, par email à support@marketlab.com ou par téléphone au +33 1 23 45 67 89.",
    },
  ];

  const processSteps = [
    {
      title: "Recherchez des services précis",
      description: "Trouvez rapidement les analyses dont vous avez besoin",
    },
    {
      title: "Consultez les offres",
      description: "Comparez les prix et les services des différents laboratoires",
    },
    {
      title: "Commandez en ligne",
      description: "Passez votre commande en quelques clics",
    },
    {
      title: "Payez en toute sécurité",
      description: "Paiement sécurisé par carte bancaire ou virement",
    },
    {
      title: "Suivez votre commande",
      description: "Recevez des notifications en temps réel sur l'avancement",
    },
  ];

  const benefits = [
    {
      icon: Microscope,
      title: "Laboratoires certifiés",
      description: "Tous nos partenaires sont certifiés et vérifiés",
    },
    {
      icon: Laptop,
      title: "Accès en ligne",
      description: "Gérez vos commandes depuis n'importe où",
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

  const popularProducts = [
    { id: 1, name: "Analyse de sang complète", price: "89€" },
    { id: 2, name: "Test ADN paternité", price: "199€" },
    { id: 3, name: "Analyse microbiologique", price: "149€" },
    { id: 4, name: "Test de dépistage", price: "59€" },
    { id: 5, name: "Analyse environnementale", price: "249€" },
    { id: 6, name: "Contrôle qualité alimentaire", price: "179€" },
    { id: 7, name: "Analyse toxicologique", price: "299€" },
    { id: 8, name: "Test génétique", price: "349€" },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header - Professional & Modern */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-24">
            <Link href="/home" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg shadow-md">
                <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 text-white" />
              </div>
              <span className="text-base sm:text-lg md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight">
                MARKET LAB
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              <a href="#accueil" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Accueil
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#marketplace" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Marketplace
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Contact
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {/* Shopping Cart Icon */}
                  <button
                    onClick={() => setCartOpen(true)}
                    className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                    {/* Cart Badge */}
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
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
                  className="hidden sm:inline-flex px-6 md:px-8 py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl items-center gap-2 text-sm md:text-base"
                >
                  <span>Connexion</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 animate-fade-in">
              <div className="flex flex-col gap-4">
                <a href="#accueil" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Accueil
                </a>
                <a href="#marketplace" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Marketplace
                </a>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Contact
                </a>
                {isAuthenticated ? (
                  <>
                    <button
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
                      onClick={() => {
                        // Handle logout
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("authToken");
                          localStorage.removeItem("cart");
                          setMobileMenuOpen(false);
                          window.location.href = "/home";
                        }
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

      {/* Hero Section - Modern with Advanced Animations */}
      <section id="accueil" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 overflow-hidden py-12 sm:py-16 md:py-0">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/20 animate-float"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`,
              }}
            />
          ))}
        </div>

        {/* Gradient Orbs - Hidden on mobile, visible on larger screens */}
        <div className="hidden sm:block absolute top-10 left-10 sm:top-20 sm:left-20 w-32 h-32 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-blue-400/30 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="hidden sm:block absolute bottom-10 right-10 sm:bottom-20 sm:right-20 w-40 h-40 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-cyan-400/30 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }}></div>
        <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-56 md:w-80 md:h-80 bg-white/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }}></div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Logo with Advanced Animation - First position */}
            <div className="inline-block mb-3 sm:mb-4 md:mb-6 animate-scale-in">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-xl sm:rounded-2xl blur-2xl animate-pulse-glow"></div>
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-white via-blue-50 to-cyan-100 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 hover:rotate-12 transition-all duration-500 animate-bounce-slow">
                  <FlaskConical className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-blue-600 animate-float" />
                </div>
              </div>
            </div>

            {/* Title with Typewriter Effect */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white mb-3 sm:mb-4 md:mb-6 animate-fade-in-up animation-delay-200 drop-shadow-2xl tracking-tight px-2 sm:px-4">
              <span className="inline-block animate-scale-in animation-delay-300 bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent">MARKET</span>{" "}
              <span className="inline-block animate-scale-in animation-delay-500">LAB</span>
            </h1>

            {/* Subtitle with Slide Animation */}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white/95 mb-3 sm:mb-4 md:mb-6 max-w-4xl mx-auto animate-fade-in-up animation-delay-400 font-medium drop-shadow-xl leading-tight px-2 sm:px-4">
              La marketplace professionnelle des laboratoires d'analyses
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-white/85 mb-6 sm:mb-8 md:mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-600 leading-relaxed font-light px-2 sm:px-4">
              Connectez-vous avec les meilleurs laboratoires certifiés et accédez à des services d'analyse de qualité supérieure
            </p>

            {/* CTA Buttons with Modern Effects */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center animate-fade-in-up animation-delay-800 px-2 sm:px-4">
              <button className="group relative px-6 py-3 sm:px-8 sm:py-4 md:px-12 md:py-6 bg-white text-blue-600 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base md:text-lg overflow-hidden transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-white/50 w-full sm:w-auto">
                <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-2 md:gap-3">
                  <span className="hidden sm:inline">Découvrir la marketplace</span>
                  <span className="sm:hidden">Découvrir</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button className="px-6 py-3 sm:px-8 sm:py-4 md:px-12 md:py-6 bg-white/15 backdrop-blur-xl text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base md:text-lg border-2 border-white/40 hover:bg-white/25 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-white/30 w-full sm:w-auto">
                En savoir plus
              </button>
            </div>
          </div>
        </div>

        {/* Modern Animated Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
          <svg 
            className="w-full h-32 md:h-40 lg:h-48" 
            viewBox="0 0 1440 200" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="50%" stopColor="white" stopOpacity="0.95" />
                <stop offset="100%" stopColor="white" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                <stop offset="50%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                <stop offset="50%" stopColor="white" stopOpacity="0.3" />
                <stop offset="100%" stopColor="white" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {/* Main Wave - Animated */}
            <path 
              d="M0,120 Q360,80 720,100 T1440,120 L1440,200 L0,200 Z" 
              fill="url(#waveGradient)"
              className="animate-wave"
            />
            {/* Secondary Wave - Delayed Animation */}
            <path 
              d="M0,140 Q360,100 720,120 T1440,140 L1440,200 L0,200 Z" 
              fill="url(#waveGradient2)"
              className="animate-wave-delayed"
            />
            {/* Accent Wave - Slow Animation */}
            <path 
              d="M0,160 Q240,120 480,140 T960,160 T1440,150 L1440,200 L0,200 Z" 
              fill="url(#waveGradient3)"
              className="animate-wave-slow"
            />
          </svg>
          {/* Gradient Overlay for Smooth Transition */}
          <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 lg:h-48 bg-gradient-to-b from-transparent via-white/30 to-white pointer-events-none"></div>
          {/* Shine Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 lg:h-48 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-shimmer"></div>
        </div>
      </section>

      {/* About Section - Professional Design */}
      <section id="about-section" className="py-12 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 items-center">
            <div className={`space-y-4 sm:space-y-6 md:space-y-8 scroll-animate-left ${visibleElements.has("about-left") ? "animate" : ""}`} id="about-left">
              <div className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-50 text-blue-600 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4">
                À propos
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 leading-tight">
                À PROPOS DE <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">MARKETLAB</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed">
                Une plateforme innovante qui révolutionne l'accès aux services d'analyse de laboratoire.
              </p>
              <ul className="space-y-3 sm:space-y-4 md:space-y-5 text-gray-700">
                <li className="flex items-start gap-3 sm:gap-4 group">
                  <div className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                    <Check className="text-blue-600 w-3 h-3 sm:w-4 sm:h-4 group-hover:text-white transform transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-sm sm:text-base md:text-lg leading-relaxed transition-all group-hover:text-gray-900">Plateforme sécurisée et certifiée pour tous vos besoins d'analyse</span>
                </li>
                <li className="flex items-start gap-3 sm:gap-4 group">
                  <div className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                    <Check className="text-blue-600 w-3 h-3 sm:w-4 sm:h-4 group-hover:text-white transform transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-sm sm:text-base md:text-lg leading-relaxed transition-all group-hover:text-gray-900">Réseau de laboratoires partenaires vérifiés et accrédités</span>
                </li>
                <li className="flex items-start gap-3 sm:gap-4 group">
                  <div className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                    <Check className="text-blue-600 w-3 h-3 sm:w-4 sm:h-4 group-hover:text-white transform transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-sm sm:text-base md:text-lg leading-relaxed transition-all group-hover:text-gray-900">Suivi en temps réel de vos commandes et résultats</span>
                </li>
                <li className="flex items-start gap-3 sm:gap-4 group">
                  <div className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                    <Check className="text-blue-600 w-3 h-3 sm:w-4 sm:h-4 group-hover:text-white transform transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-sm sm:text-base md:text-lg leading-relaxed transition-all group-hover:text-gray-900">Support client dédié disponible 7j/7</span>
                </li>
                <li className="flex items-start gap-3 sm:gap-4 group">
                  <div className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                    <Check className="text-blue-600 w-3 h-3 sm:w-4 sm:h-4 group-hover:text-white transform transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-sm sm:text-base md:text-lg leading-relaxed transition-all group-hover:text-gray-900">Paiements sécurisés et facturation simplifiée</span>
                </li>
              </ul>
              <button className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-sm sm:text-base md:text-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl mt-4 sm:mt-6 md:mt-8 inline-flex items-center gap-2">
                <span>En savoir plus</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
            <div className={`grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 scroll-animate-right ${visibleElements.has("about-right") ? "animate" : ""}`} id="about-right">
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="aspect-square bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl border border-blue-100/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
                  <div className="p-3 sm:p-4 md:p-6 bg-white/50 rounded-xl md:rounded-2xl backdrop-blur-sm">
                    <Microscope className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 text-blue-600 transform transition-transform duration-300 hover:scale-110" />
                  </div>
                </div>
                <div className="aspect-square bg-gradient-to-br from-purple-50 via-purple-100 to-pink-100 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl border border-purple-100/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
                  <div className="p-3 sm:p-4 md:p-6 bg-white/50 rounded-xl md:rounded-2xl backdrop-blur-sm">
                    <User className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 text-purple-600 transform transition-transform duration-300 hover:scale-110" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4 md:space-y-6 pt-6 sm:pt-8 md:pt-12">
                <div className="aspect-square bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl border border-green-100/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
                  <div className="p-3 sm:p-4 md:p-6 bg-white/50 rounded-xl md:rounded-2xl backdrop-blur-sm">
                    <FlaskConical className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 text-green-600 transform transition-transform duration-300 hover:scale-110" />
                  </div>
                </div>
                <div className="aspect-square bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl border border-orange-100/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
                  <div className="p-3 sm:p-4 md:p-6 bg-white/50 rounded-xl md:rounded-2xl backdrop-blur-sm">
                    <FlaskConical className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 text-orange-600 transform transition-transform duration-300 hover:scale-110" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section - Professional */}
      <section className="py-12 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-br from-gray-900 via-blue-900 to-cyan-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
          <div className="text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20">
            <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm text-blue-200 rounded-full text-xs md:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4 md:mb-6">
              Processus
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white mb-3 sm:mb-4 md:mb-6 leading-tight px-2 sm:px-4">
              Comment ça <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">fonctionne</span> ?
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-blue-100 mb-6 sm:mb-8 md:mb-10 font-light px-2 sm:px-4">Simple. Rapide. Professionnel.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {processSteps.map((step, index) => {
              const icons = [Search, FileText, ShoppingCart, CreditCard, Package];
              const IconComponent = icons[index];
              return (
                <div
                  key={index}
                  className={`bg-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl scroll-animate-scale group`}
                  id={`step-${index}`}
                  style={{ 
                    transitionDelay: `${index * 50}ms`,
                    ...(visibleElements.has(`step-${index}`) ? { opacity: 1, transform: "scale(1)" } : {})
                  }}
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 transform transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 shadow-lg">
                    <IconComponent className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div className="text-blue-300 text-xs md:text-sm font-bold mb-2 md:mb-3">Étape {index + 1}</div>
                  <h3 className="text-white font-bold text-base md:text-lg lg:text-xl mb-2 md:mb-3 leading-tight">{step.title}</h3>
                  <p className="text-blue-100 text-sm md:text-base leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Section - Professional */}
      <section className="py-12 sm:py-16 md:py-24 lg:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20">
            <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-blue-50 text-blue-600 rounded-full text-xs md:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4 md:mb-6">
              Avantages
            </div>
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 mb-3 sm:mb-4 md:mb-6 scroll-animate ${visibleElements.has("why-title") ? "animate" : ""}`} id="why-title">
              Pourquoi choisir <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">MarketLab</span> ?
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2 sm:px-4">Des solutions professionnelles pour tous vos besoins d'analyse</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div
                  key={index}
                  className={`bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 text-center hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 hover:border-blue-200 scroll-animate-scale group`}
                  id={`benefit-${index}`}
                  style={{ 
                    transitionDelay: `${index * 50}ms`,
                    ...(visibleElements.has(`benefit-${index}`) ? { opacity: 1, transform: "scale(1)" } : {})
                  }}
                >
                  <div className="mb-4 md:mb-6 transform transition-all duration-300 inline-block group-hover:scale-110 group-hover:rotate-6">
                    <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:from-blue-100 group-hover:to-cyan-100 transition-all duration-300">
                      <IconComponent className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 md:mb-3 text-sm md:text-base lg:text-lg transition-colors group-hover:text-blue-600">{benefit.title}</h3>
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supplier Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 px-2 sm:px-4">
              Vous êtes fournisseur ?
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto px-2 sm:px-4">
              Rejoignez notre réseau de laboratoires partenaires et développez votre activité en ligne. 
              Gérez vos commandes, suivez vos performances et accédez à de nouveaux clients.
            </p>
            <button className="px-5 py-2.5 sm:px-6 sm:py-3 md:px-8 md:py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg mb-6 sm:mb-8 md:mb-12 text-xs sm:text-sm md:text-base">
              Devenir fournisseur
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-6 sm:mt-8 md:mt-12">
              <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 hover-lift scroll-animate-scale`} id="supplier-1">
                <Laptop className="w-12 h-12 text-blue-600 mb-4 mx-auto transform transition-transform hover:scale-125 hover:rotate-6" />
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors hover:text-blue-600">Gestion en ligne</h3>
                <p className="text-gray-600 text-sm">Tableau de bord complet pour gérer vos commandes</p>
              </div>
              <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 hover-lift scroll-animate-scale`} id="supplier-2" style={{ transitionDelay: "100ms" }}>
                <Truck className="w-12 h-12 text-blue-600 mb-4 mx-auto transform transition-transform hover:scale-125 hover:rotate-6" />
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors hover:text-blue-600">Logistique intégrée</h3>
                <p className="text-gray-600 text-sm">Solutions de livraison et suivi des envois</p>
              </div>
              <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 hover-lift scroll-animate-scale`} id="supplier-3" style={{ transitionDelay: "200ms" }}>
                <Phone className="w-12 h-12 text-blue-600 mb-4 mx-auto transform transition-transform hover:scale-125 hover:rotate-6" />
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors hover:text-blue-600">Support dédié</h3>
                <p className="text-gray-600 text-sm">Équipe d'assistance pour vous accompagner</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Laboratory Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div className={`scroll-animate-left ${visibleElements.has("lab-left") ? "animate" : ""}`} id="lab-left">
              <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 aspect-square flex items-center justify-center hover-lift">
                <Laptop className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 text-white transform transition-transform hover:scale-110 hover:rotate-6" />
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in-right">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                Vous êtes un laboratoire ?
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-blue-100">
                Accédez à une plateforme complète pour développer votre activité et servir vos clients plus efficacement.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 group">
                  <Check className="text-white w-5 h-5 mt-1 flex-shrink-0 transform transition-transform group-hover:scale-125" />
                  <span className="transition-all group-hover:text-blue-200">Accès à un large réseau de clients professionnels</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <Check className="text-white w-5 h-5 mt-1 flex-shrink-0 transform transition-transform group-hover:scale-125" />
                  <span className="transition-all group-hover:text-blue-200">Outils de gestion et de suivi intégrés</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <Check className="text-white w-5 h-5 mt-1 flex-shrink-0 transform transition-transform group-hover:scale-125" />
                  <span className="transition-all group-hover:text-blue-200">Facturation et paiement automatisés</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <Check className="text-white w-5 h-5 mt-1 flex-shrink-0 transform transition-transform group-hover:scale-125" />
                  <span className="transition-all group-hover:text-blue-200">Formation et support technique inclus</span>
                </li>
              </ul>
              <button className="px-6 py-3 sm:px-8 sm:py-4 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 mt-4 sm:mt-6 text-sm sm:text-base">
                Devenir laboratoire
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-3 sm:mb-4 md:mb-6 px-2 sm:px-4">
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

      {/* Popular Products Section */}
      <section id="marketplace" className="py-12 sm:py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 md:mb-12 gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              Produits les plus populaires
            </h2>
            <Link
              href="/products"
              className="px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all transform hover:scale-105 text-xs sm:text-sm md:text-base w-full sm:w-auto inline-block text-center"
            >
              Voir tous les produits
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {popularProducts.map((product, index) => (
              <div
                key={product.id}
                className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 border border-gray-100 hover-lift scroll-animate-scale`}
                id={`product-${index}`}
                style={{ 
                  transitionDelay: `${index * 50}ms`,
                  ...(visibleElements.has(`product-${index}`) ? { opacity: 1, transform: "scale(1)" } : {})
                }}
              >
                <Link href={`/products/${product.id}`}>
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 flex items-center justify-center transform transition-transform hover:scale-110 cursor-pointer">
                    <FlaskConical className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 transform transition-transform hover:rotate-12" />
                  </div>
                </Link>
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 transition-colors hover:text-blue-600 line-clamp-2 cursor-pointer">{product.name}</h3>
                  </Link>
                  <button className="text-gray-400 hover:text-red-500 transition-all transform hover:scale-125 flex-shrink-0 ml-2">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 mb-3 sm:mb-4">{product.price}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                      });
                      setCartOpen(true);
                    }}
                    className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all transform hover:scale-105 hover:shadow-lg text-sm sm:text-base"
                  >
                    Ajouter
                  </button>
                  <Link
                    href={`/products/${product.id}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm sm:text-base"
                  >
                    Détails
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-bold">MARKET LAB</span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                La marketplace professionnelle des laboratoires d'analyses
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">Navigation</h3>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#accueil" className="hover:text-white transition-colors">Accueil</a></li>
                <li><a href="#marketplace" className="hover:text-white transition-colors">Marketplace</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">Légal</h3>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Mentions légales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Conditions générales de vente</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">Support</h3>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Aide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Nous contacter</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-gray-400 text-xs sm:text-sm">
            <p>© 2024 MarketLab. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Cart Panel */}
      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

