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
  ShoppingBag,
  Building2,
  Tag,
  Clock,
  Bell,
  MessageCircle,
  Mail,
  Send,
  CheckCircle,
  FolderTree,
  Megaphone,
  Percent,
} from "lucide-react";
import CartPanel from "@/components/CartPanel";
import UserDropdown from "@/components/UserDropdown";
import LoginAlert from "@/components/LoginAlert";
import { getAuthToken, getAllProducts, PublicProduct, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, NotificationData, createProblem, getProfile, ClientData, saveFcmToken, getPublicCategories, Category } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { io as socketIO } from "socket.io-client";
import { getBaseUrl } from "@/lib/api-config";
import { getMediaUrl } from "@/lib/media-url";
import SponsoredProductsCarousel from "@/components/SponsoredProductsCarousel";
import PromotionsShowcase from "@/components/PromotionsShowcase";

export default function HomePage() {
  const { getTotalItems, addToCart } = useCart();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<ClientData | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const cartItemCount = getTotalItems();
  const isClientUser = userRole === "client";
  const [particles, setParticles] = useState<Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    animationDelay: number;
    animationDuration: number;
  }>>([]);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportFormData, setSupportFormData] = useState({
    email: "",
    phone: "",
    message: "",
  });
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Check authentication status and role
  useEffect(() => {
    const loadUserData = async () => {
    const token = getAuthToken();
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role || null;
        setUserRole(role);
        
        // Only set authenticated and show client features if role is "client"
        if (role === "client") {
          setIsAuthenticated(true);
          setUserEmail(payload.email || "");
            
            // Load user profile data
            const profileResult = await getProfile();
            if (profileResult.success && profileResult.data) {
              setUserData(profileResult.data);
            }
        } else {
          // Admin or supplier should not see client features on home page
          setIsAuthenticated(false);
          setUserEmail("");
            setUserData(null);
        }
      } catch {
        // If token parsing fails, don't show authenticated state
        setIsAuthenticated(false);
        setUserRole(null);
          setUserData(null);
      }
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
        setUserData(null);
    }
    };

    loadUserData();
  }, []);

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

  // Fetch products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);
        const result = await getAllProducts();
        if (result.success && result.data && result.data.products) {
          // Get first 8 products (prioritize in-stock products)
          const inStockProducts = result.data.products.filter((p: PublicProduct) => p.quantity > 0);
          const outOfStockProducts = result.data.products.filter((p: PublicProduct) => p.quantity === 0);
          // Show in-stock products first, then out-of-stock if needed
          const productsToShow = [...inStockProducts, ...outOfStockProducts].slice(0, 8);
          setProducts(productsToShow);
        } else {
          setProductsError(result.message || "Aucun produit trouvé");
          setProducts([]);
        }
      } catch (err) {
        setProductsError("Erreur lors du chargement des produits");
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const result = await getPublicCategories();
        if (result.success && result.data) {
          setCategories(result.data.categories || []);
        } else {
          setCategories([]);
        }
      } catch {
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Load notifications for clients
  useEffect(() => {
    if (isAuthenticated && isClientUser) {
      loadNotifications();
      setupSocketConnection();
      setupFcmTokenListener();
    }
  }, [isAuthenticated, isClientUser]);

  // Listen for FCM token from React Native WebView (mobile app)
  const setupFcmTokenListener = () => {
    // Check if we're running in React Native WebView
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      // Request FCM token when user is logged in (in case token was removed from database)
      const requestFcmToken = () => {
        if (isAuthenticated && isClientUser) {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({
            type: 'REQUEST_FCM_TOKEN'
          }));
        }
      };
      
      // Request token immediately if user is already logged in
      requestFcmToken();
      
      // Request token periodically (every 5 minutes) to ensure it's always up to date
      // Reduced frequency to minimize backend requests
      const tokenRequestInterval = setInterval(() => {
        if (isAuthenticated && isClientUser) {
          requestFcmToken();
        }
      }, 300000); // Every 5 minutes instead of 30 seconds
      
      // Listen for messages from React Native
      window.addEventListener("message", async (event) => {
        try {
          const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          
          if (message.type === "FCM_TOKEN" && message.token) {
            // Send FCM token to backend
            const authToken = getAuthToken();
            if (authToken) {
              const result = await saveFcmToken(message.token);
              if (result.success) {
                // Clear interval once token is saved (we'll request again if needed)
                clearInterval(tokenRequestInterval);
              }
            }
          }
        } catch (error) {
          // Silent error handling
        }
      });

      // Also listen for postMessage (React Native WebView uses this)
      const handlePostMessage = async (event: MessageEvent) => {
        try {
          const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          
          if (message.type === "FCM_TOKEN" && message.token) {
            // Send FCM token to backend
            const authToken = getAuthToken();
            if (authToken) {
              await saveFcmToken(message.token);
            }
          }
        } catch (error) {
          // Silent error handling
        }
      };

      window.addEventListener("message", handlePostMessage);
      
      return () => {
        window.removeEventListener("message", handlePostMessage);
        // Cleanup interval if component unmounts
        if (tokenRequestInterval) {
          clearInterval(tokenRequestInterval);
        }
      };
    }
  };

  const loadNotifications = async () => {
    try {
      const result = await getNotifications(true); // Only unread
      if (result.success && result.data) {
        setNotifications(result.data.notifications || []);
        setUnreadCount(result.data.unreadCount || 0);
      }
    } catch (err) {
      // Silent error handling
    }
  };

  const setupSocketConnection = () => {
    const token = getAuthToken();
    if (!token) return;

    const socket = socketIO(getBaseUrl(), {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      // Socket connected
    });

    socket.on("orderStatusUpdate", async (data: {
      orderId: string;
      status: string;
      message: string;
      notificationId: string;
    }) => {
      // Reload notifications when status update arrives
      await loadNotifications();
      
      // Show browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Mise à jour de commande", {
          body: data.message,
          icon: "/favicon.ico",
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    // Mark as read
    await markNotificationAsRead(notification._id);
    // Reload notifications
    await loadNotifications();
    // Navigate to orders page
    window.location.href = "/orders";
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      // Silent error handling
    }
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


  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header - Professional & Modern */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-24">
            <Link href="/home" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group">
              <div className="transform transition-all duration-300 group-hover:scale-105">
                <Image
                  src="/pi/ima.png"
                  alt="Marketj Lab Logo"
                  width={120}
                  height={40}
                  className="h-8 sm:h-10 md:h-12 w-auto object-contain"
                  priority
                />
             
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              <a href="#accueil" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Accueil
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <Link href="/products" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Marketplace
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <a href="#sponsored-section" className="text-gray-700 hover:text-purple-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group flex items-center gap-1.5">
                <Megaphone className="w-4 h-4" />
                Sponsors
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#promotions-section" className="text-gray-700 hover:text-orange-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group flex items-center gap-1.5">
                <Percent className="w-4 h-4" />
                Promotions
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                Contact
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              {isAuthenticated && isClientUser && (
                <Link href="/suppliers" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group">
                  Suppliers
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              )}
              {isAuthenticated && isClientUser && (
                <Link href="/favorable" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>Favorable</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              )}
              {isAuthenticated && isClientUser && (
                <Link href="/orders" className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium text-sm uppercase tracking-wide relative group flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Mes Commandes</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated && isClientUser ? (
                <>
                  {/* Notifications */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowNotifications(!showNotifications);
                        if (!showNotifications && unreadCount > 0) {
                          loadNotifications();
                        }
                      }}
                      className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <Bell className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowNotifications(false)}
                        />
                        <div className="fixed left-1/2 -translate-x-1/2 top-20 w-[calc(100vw-2rem)] sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-auto sm:mt-2 sm:w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fade-in-up max-h-[70vh] sm:max-h-96 overflow-y-auto">
                          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                            <h3 className="font-bold text-base sm:text-lg">Notifications</h3>
                            <p className="text-xs sm:text-sm text-blue-100">
                              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                            </p>
                              </div>
                              {unreadCount > 0 && (
                                <button
                                  onClick={handleMarkAllNotificationsAsRead}
                                  className="text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                  Tout marquer lu
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="divide-y divide-gray-200">
                            {notifications.length === 0 ? (
                              <div className="p-6 text-center text-gray-500">
                                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Aucune notification</p>
                              </div>
                            ) : (
                              notifications.map((notification) => (
                                <div
                                  key={notification._id}
                                  className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                                    !notification.isRead ? "bg-blue-50 border-l-4 border-blue-500" : ""
                                  }`}
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  <div className="flex items-start gap-2 sm:gap-3">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      notification.type === "order_status" 
                                        ? "bg-gradient-to-br from-blue-600 to-cyan-600"
                                        : notification.type === "new_order"
                                        ? "bg-gradient-to-br from-green-600 to-emerald-600"
                                        : "bg-gradient-to-br from-gray-600 to-gray-700"
                                    }`}>
                                      {notification.type === "order_status" ? (
                                      <Truck className="w-5 h-5 text-white" />
                                      ) : notification.type === "new_order" ? (
                                        <ShoppingCart className="w-5 h-5 text-white" />
                                      ) : (
                                        <Bell className="w-5 h-5 text-white" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-xs sm:text-sm text-gray-900 break-words">
                                            {notification.type === "order_status" 
                                              ? "Mise à jour de commande" 
                                              : notification.type === "new_order"
                                              ? "Nouvelle commande"
                                              : "Notification système"}
                                      </p>
                                          {notification.idSender && typeof notification.idSender === 'object' && (
                                            <p className="text-xs text-gray-500 mt-0.5 break-words">
                                              De: {notification.idSender.firstName} {notification.idSender.lastName}
                                            </p>
                                          )}
                                        </div>
                                        {!notification.isRead && (
                                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2 break-words">
                                        {notification.message}
                                      </p>
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 mt-1.5 sm:mt-2">
                                        <p className="text-xs text-gray-400">
                                          {new Date(notification.createdAt).toLocaleString("fr-FR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                          })}
                                      </p>
                                        {notification.type === "order_status" && (
                                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                            Commande
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

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
                <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Marketplace
                </Link>
                <a href="#sponsored-section" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-purple-600 transition-colors font-medium py-2 flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  Sponsors
                </a>
                <a href="#promotions-section" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-orange-600 transition-colors font-medium py-2 flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Promotions
                </a>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Contact
                </a>
                {isAuthenticated && isClientUser && (
                  <Link href="/suppliers" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>Suppliers</span>
                  </Link>
                )}
                {isAuthenticated && isClientUser && (
                  <Link href="/favorable" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    <span>Favorable</span>
                  </Link>
                )}
                {isAuthenticated && isClientUser && (
                  <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Mes Commandes</span>
                  </Link>
                )}
                {isAuthenticated && isClientUser ? (
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
              <Link
                href="/products"
                className="group relative px-6 py-3 sm:px-8 sm:py-4 md:px-12 md:py-6 bg-white text-blue-600 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base md:text-lg overflow-hidden transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-white/50 w-full sm:w-auto inline-flex items-center justify-center"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-2 md:gap-3">
                  <span className="hidden sm:inline">Découvrir la marketplace</span>
                  <span className="sm:hidden">Découvrir</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
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

      <SponsoredProductsCarousel />

      {/* Categories Section */}
      <section id="categories" className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-block px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3">
              Explorer
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Nos catégories
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Parcourez nos catégories et découvrez les produits par sous-catégorie
            </p>
          </div>

          {isLoadingCategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-gray-100 aspect-[4/5]" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-gray-300">
              <FolderTree className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Aucune catégorie disponible pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {categories.map((cat) => {
                const catImage = getMediaUrl(cat.image);
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.id}`}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-blue-200"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {catImage ? (
                        <img
                          src={catImage}
                          alt={cat.name_catgory}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FolderTree className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                        <h3 className="font-bold text-white text-sm sm:text-base line-clamp-2">
                          {cat.name_catgory}
                        </h3>
                        {cat.sousCategories.length > 0 && (
                          <p className="text-xs text-white/80 mt-1">
                            {cat.sousCategories.length} sous-catégorie{cat.sousCategories.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{cat.des}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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
                Créez votre compte en tant que laboratoire
              </button>
            </div>
          </div>
        </div>
      </section>

      <PromotionsShowcase />

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
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="aspect-square bg-gray-200 rounded-lg sm:rounded-xl mb-3 sm:mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
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
              <p className="text-gray-600">Aucun produit disponible pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {products.map((product, index) => {
                const mainImage = product.images && product.images.length > 0
                  ? getMediaUrl(product.images[0])
                  : null;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group"
                    id={`product-${index}`}
                    style={{ 
                      transitionDelay: `${index * 50}ms`,
                      ...(visibleElements.has(`product-${index}`) ? { opacity: 1, transform: "scale(1)" } : {})
                    }}
                  >
                    {/* Image Section */}
                    <Link href={`/products/${product.id}`}>
                      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FlaskConical className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              product.productType === "Labo médical"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {product.productType}
                          </span>
                        </div>
                        {product.quantity === 0 && (
                          <div className="absolute top-3 left-3">
                            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                              Rupture de stock
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Content Section */}
                    <div className="p-5">
                      {/* Product Name */}
                      <Link href={`/products/${product.id}`}>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Supplier Info */}
                      {product.supplier && (
                        <Link
                          href={`/supplier/${product.supplier.id}`}
                          className="flex items-center gap-2 mb-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                        >
                          <Building2 className="w-4 h-4 group-hover:text-blue-600" />
                          <span className="truncate group-hover:underline">{product.supplier.name}</span>
                          {product.supplier.certife && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                              Certifie
                            </span>
                          )}
                        </Link>
                      )}

                      {/* Brand and Category */}
                      <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          <span className="truncate">{product.category}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{product.brand}</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-blue-600">{product.price.toFixed(2)} DA</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{product.deliveryTime}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (isClientUser) {
                              addToCart({
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                supplierId: product.supplier?.id || "",
                              });
                              setCartOpen(true);
                            } else {
                              setLoginAlertOpen(true);
                            }
                          }}
                          disabled={product.quantity === 0}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>{product.quantity === 0 ? "Rupture" : "Ajouter"}</span>
                        </button>
                        <Link
                          href={`/products/${product.id}`}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center"
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

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3 sm:mb-4" >
                <Image
                style={{
                  borderRadius: "3px",
                }}
                  src="/pi/ima.png"
                  alt="Market Lab Logo"
                  width={80}
                  height={80}
                  className="h-6 sm:h-8 w-auto object-contain"
                />
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                La marketplace professionnelle des laboratoires d'analyses
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">Navigation</h3>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#accueil" className="hover:text-white transition-colors">Accueil</a></li>
                <li><Link href="/products" className="hover:text-white transition-colors">Marketplace</Link></li>
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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-110"
        aria-label="Contacter le support"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

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

