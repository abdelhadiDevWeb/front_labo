"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Package, Loader2, ArrowLeft, CheckCircle, Truck, Clock, Filter, Printer, Phone, Upload, FileText, X, Eye, Building2, Mail, Star } from "lucide-react";
import { createPayment, getPaymentsByCommandes, Payment, apiFetch, getSessionRole, confirmOrderArrival } from "@/lib/api";
import { consumePendingPaymentOrderIds } from "@/lib/flow-session";
import { printInvoiceSafely } from "@/lib/invoice-print";
import Link from "next/link";
import Image from "next/image";
import { io as socketIO } from "socket.io-client";
import { getApiUrl, getBaseUrl } from "@/lib/api-config";
import { getMediaUrl } from "@/lib/media-url";

interface Order {
  _id: string;
  total: number;
  products: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    itemType?: "product" | "machine";
  }>;
  idBuyer: string;
  idSupplier: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  status: "en attente" | "refusée" | "en cours" | "on route" | "arrived";
  createdAt: string;
  updatedAt: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersCursor, setOrdersCursor] = useState<string | null>(null);
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payments, setPayments] = useState<{ [commandeId: string]: Payment }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [pendingOrderIds, setPendingOrderIds] = useState<string[]>([]);
  const [currentPendingOrderIndex, setCurrentPendingOrderIndex] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<{ [orderId: string]: File | null }>({});
  const [uploadingOrders, setUploadingOrders] = useState<Set<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<{ [orderId: string]: string | null }>({});
  const printRef = useRef<HTMLDivElement>(null);

  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSessionRole();
      if (!session) {
        router.push("/login");
        return;
      }

      if (session.role !== "client") {
        router.push("/home");
        return;
      }

      setIsAuthenticated(true);
      // Show page as soon as auth is done; orders load next
      setIsLoading(false);
      setOrdersLoading(true);
      void loadOrders().finally(() => setOrdersLoading(false));
    };

    checkAuth();
  }, [router]);

  // Real-time updates for client orders (status changes/new orders)
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = socketIO(getBaseUrl(), {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    const refreshOrders = () => {
      void loadOrders();
    };

    socket.on("orderStatusUpdate", refreshOrders);
    socket.on("newOrder", refreshOrders);

    return () => {
      socket.off("orderStatusUpdate", refreshOrders);
      socket.off("newOrder", refreshOrders);
      socket.disconnect();
    };
  }, [isAuthenticated]);
  
  // Check URL params for payment upload (single or multiple orders)
  useEffect(() => {
    if (typeof window !== "undefined" && orders.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const uploadPayment = params.get("uploadPayment");

      if (uploadPayment === "true") {
        router.replace("/orders");

        const storedOrderIds = consumePendingPaymentOrderIds();
        if (storedOrderIds.length > 0) {
          setPendingOrderIds(storedOrderIds);
          setShowUploadModal(true);
          const files: { [orderId: string]: File | null } = {};
          const errors: { [orderId: string]: string | null } = {};
          storedOrderIds.forEach((id) => {
            files[id] = null;
            errors[id] = null;
          });
          setUploadFiles(files);
          setUploadErrors(errors);
        }
      }
    }
  }, [orders, router]);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showUploadModal || showPaymentModal || reviewOrder) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showUploadModal, showPaymentModal, reviewOrder]);

  const loadOrders = async (opts?: { append?: boolean; cursor?: string | null }) => {
    try {
      const API_BASE_URL = getApiUrl();
      const append = Boolean(opts?.append);
      const params = new URLSearchParams({ limit: "50" });
      if (opts?.cursor) params.set("cursor", opts.cursor);

      const response = await apiFetch(
        `${API_BASE_URL}/commandes/client?${params.toString()}`
      );
      if (!response.ok) {
        console.error("Failed to load orders", response.status);
        throw new Error("Failed to load orders");
      }

      const result = await response.json();
      if (!result.success) {
        console.error("Orders API error", result.message);
        return;
      }

      const pageOrders: Order[] = Array.isArray(result.data?.orders)
        ? result.data.orders
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.orders)
            ? result.orders
            : [];

      setOrders((prev) => (append ? [...prev, ...pageOrders] : pageOrders));
      setOrdersHasMore(Boolean(result.data?.hasMore));
      setOrdersCursor(result.data?.nextCursor || null);

      try {
        if (pageOrders.length > 0) {
          const paymentResult = await getPaymentsByCommandes(pageOrders.map((o) => o._id));
          const pagePayments =
            (paymentResult.success && paymentResult.data?.paymentsByCommande
              ? paymentResult.data.paymentsByCommande
              : {}) as { [commandeId: string]: Payment };
          setPayments((prev) => (append ? { ...prev, ...pagePayments } : pagePayments));
        } else if (!append) {
          setPayments({});
        }
      } catch {
        // Payments optional
      }
    } catch (err) {
      console.error("Load client orders error:", err);
    }
  };

  const loadMoreOrders = async () => {
    if (!ordersHasMore || !ordersCursor || loadingMoreOrders) return;
    setLoadingMoreOrders(true);
    try {
      await loadOrders({ append: true, cursor: ordersCursor });
    } finally {
      setLoadingMoreOrders(false);
    }
  };

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter]);

  const filterOrders = () => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter((order) => order.status === statusFilter));
    }
  };

  const handlePrintInvoice = (order: Order) => {
    printInvoiceSafely(order);
  };

  const openReviewModal = (order: Order) => {
    setReviewOrder(order);
    setReviewStars(5);
    setReviewHover(0);
    setReviewMessage("");
    setReviewError(null);
  };

  const submitArrivalReview = async () => {
    if (!reviewOrder) return;
    if (reviewStars < 1 || reviewStars > 5) {
      setReviewError("Choisissez une note de 1 à 5 étoiles");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const result = await confirmOrderArrival(
        reviewOrder._id,
        reviewStars,
        reviewMessage
      );
      if (!result.success) {
        setReviewError(result.message || "Impossible de confirmer la réception");
        return;
      }
      setReviewOrder(null);
      await loadOrders();
    } catch {
      setReviewError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "en attente":
        return <Clock className="w-5 h-5 text-amber-600" />;
      case "refusée":
        return <X className="w-5 h-5 text-red-600" />;
      case "en cours":
        return <Clock className="w-5 h-5 text-blue-600" />;
      case "on route":
        return <Truck className="w-5 h-5 text-orange-600" />;
      case "arrived":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "en attente": "bg-amber-100 text-amber-800 border-amber-300",
      "refusée": "bg-red-100 text-red-700 border-red-300",
      "en cours": "bg-blue-100 text-blue-700 border-blue-300",
      "on route": "bg-orange-100 text-orange-700 border-orange-300",
      "arrived": "bg-green-100 text-green-700 border-green-300",
    };
    const labels: Record<string, string> = {
      "en attente": "En attente",
      "refusée": "Refusée",
      "en cours": "en cours",
      "on route": "on route",
      "arrived": "arrived",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/home"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Mes Réserves</h1>
                  <p className="text-sm text-gray-600">
                    {orders.length} réserve{orders.length > 1 ? "s" : ""} au total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setStatusFilter("en attente")}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  statusFilter === "en attente"
                    ? "bg-amber-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Clock className="w-4 h-4" />
                En attente
              </button>
              <button
                onClick={() => setStatusFilter("en cours")}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  statusFilter === "en cours"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Clock className="w-4 h-4" />
                En cours
              </button>
              <button
                onClick={() => setStatusFilter("on route")}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  statusFilter === "on route"
                    ? "bg-orange-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Truck className="w-4 h-4" />
                En route
              </button>
              <button
                onClick={() => setStatusFilter("arrived")}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  statusFilter === "arrived"
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Arrivées
              </button>
              <button
                onClick={() => setStatusFilter("refusée")}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  statusFilter === "refusée"
                    ? "bg-red-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <X className="w-4 h-4" />
                Refusée
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hidden print area */}
        <div ref={printRef} className="hidden" />

        {ordersLoading && orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Chargement des réserves...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Aucune réserve</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Vous n'avez pas encore passé de réserve. Parcourez notre marketplace pour découvrir nos services.
            </p>
            <Link
              href="/home#marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Explorer la Marketplace</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(order.status)}
                        <h3 className="text-lg font-bold text-gray-900">
                          Réserve #{order._id.slice(-8).toUpperCase()}
                        </h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Fournisseur: {order.idSupplier.firstName} {order.idSupplier.lastName}
                      </p>
                      {order.idSupplier.phone && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {order.idSupplier.phone}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Date: {new Date(order.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {order.total.toFixed(2)} DA
                      </p>
                    </div>
                  </div>

                  {/* Products List */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Articles:</h4>
                    <div className="space-y-2">
                      {order.products.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.itemType === "machine" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                                  Machine
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {product.price.toFixed(2)} DA × {product.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {(product.price * product.quantity).toFixed(2)} DA
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Section */}
                  <div className="mb-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Preuve de paiement:</h4>
                    {order.status === "en attente" ? (
                      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <Clock className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-amber-800">
                          En attente de confirmation du fournisseur. Le paiement sera possible après acceptation.
                        </span>
                      </div>
                    ) : order.status === "refusée" ? (
                      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <X className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-red-700 font-medium">
                          Le fournisseur a rejeté votre réservation.
                        </span>
                      </div>
                    ) : payments[order._id] ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">Preuve de paiement uploadée</span>
                        <button
                          onClick={() => {
                            setSelectedPayment(payments[order._id]);
                            setShowPaymentModal(true);
                          }}
                          className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          Voir la preuve
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <FileText className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-yellow-700 flex-1">Aucune preuve de paiement uploadée</span>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setPendingOrderIds([order._id]);
                            setUploadFiles({ [order._id]: null });
                            setUploadErrors({ [order._id]: null });
                            setShowUploadModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          Uploader
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Print / confirm arrival */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    {order.status === "on route" && (
                      <button
                        onClick={() => openReviewModal(order)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirmer la réception
                      </button>
                    )}
                    {order.status === "arrived" && (
                      <span className="inline-flex items-center gap-2 text-emerald-700 text-sm font-semibold mr-auto">
                        <CheckCircle className="w-4 h-4" />
                        Réception confirmée
                      </span>
                    )}
                    <button
                      onClick={() => handlePrintInvoice(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer la réserve
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {ordersHasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => void loadMoreOrders()}
                  disabled={loadingMoreOrders}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-800 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMoreOrders ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    "Charger plus de réserves"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Review + confirm arrival modal */}
      {reviewOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmer la réception</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Donnez votre avis sur le fournisseur
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingReview && setReviewOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                  Notez votre expérience
                </p>
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (reviewHover || reviewStars) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setReviewHover(star)}
                        onMouseLeave={() => setReviewHover(0)}
                        onClick={() => setReviewStars(star)}
                        className="p-1 transition-transform hover:scale-110"
                        aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`w-8 h-8 ${
                            active
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {reviewStars}/5
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={reviewMessage}
                  onChange={(e) => setReviewMessage(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Partagez votre avis sur la livraison..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none"
                />
              </div>

              {reviewError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {reviewError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => setReviewOrder(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => void submitArrivalReview()}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    "Confirmer & noter"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Payment Modal - Show all orders at once */}
      {showUploadModal && pendingOrderIds.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Uploader les preuves de paiement</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {pendingOrderIds.length} réserve{pendingOrderIds.length > 1 ? "s" : ""} nécessite{pendingOrderIds.length > 1 ? "nt" : ""} une preuve de paiement
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedOrder(null);
                  setUploadFiles({});
                  setUploadErrors({});
                  setUploadingOrders(new Set());
                  setPendingOrderIds([]);
                  setCurrentPendingOrderIndex(0);
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {pendingOrderIds.map((orderId, index) => {
                const order = orders.find(o => o._id === orderId);
                if (!order) return null;
                
                const isUploadingOrder = uploadingOrders.has(orderId);
                const orderUploadError = uploadErrors[orderId];
                const orderUploadFile = uploadFiles[orderId];
                
                return (
                  <div
                    key={orderId}
                    className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white hover:border-blue-300 transition-all"
                  >
                    {/* Order Header with Supplier Details */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900">
                                Réserve #{order._id.slice(-8).toUpperCase()}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Date: {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {order.total.toFixed(2)} DA
                          </p>
                        </div>
                      </div>
                      
                      {/* Supplier Details */}
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <h5 className="font-semibold text-gray-900">Fournisseur</h5>
                        </div>
                        <p className="text-gray-900 font-medium">
                          {order.idSupplier.firstName} {order.idSupplier.lastName}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span>{order.idSupplier.email}</span>
                          </div>
                          {order.idSupplier.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              <span>{order.idSupplier.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Products Summary */}
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">{order.products.length}</span> produit{order.products.length > 1 ? "s" : ""}
                        </p>
                        <div className="text-xs text-gray-500">
                          {order.products.slice(0, 2).map(p => p.name).join(", ")}
                          {order.products.length > 2 && ` +${order.products.length - 2} autre${order.products.length - 2 > 1 ? "s" : ""}`}
                        </div>
                      </div>
                    </div>

                    {/* Payment Upload Section */}
                    {payments[orderId] ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">Preuve de paiement déjà uploadée</span>
                        <button
                          onClick={() => {
                            setSelectedPayment(payments[orderId]);
                            setShowPaymentModal(true);
                          }}
                          className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500">
                          Veuillez uploader le PDF de la preuve de paiement de la Poste Algérienne
                        </p>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fichier PDF (max 10MB)
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            disabled={isUploadingOrder}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 10 * 1024 * 1024) {
                                  setUploadErrors(prev => ({
                                    ...prev,
                                    [orderId]: "Le fichier ne doit pas dépasser 10MB"
                                  }));
                                  return;
                                }
                                setUploadFiles(prev => ({
                                  ...prev,
                                  [orderId]: file
                                }));
                                setUploadErrors(prev => ({
                                  ...prev,
                                  [orderId]: null
                                }));
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {orderUploadFile && (
                            <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {orderUploadFile.name}
                            </p>
                          )}
                        </div>

                        {orderUploadError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{orderUploadError}</p>
                          </div>
                        )}

                        <button
                          onClick={async () => {
                            if (!orderUploadFile) return;
                            
                            setUploadingOrders(prev => new Set(prev).add(orderId));
                            setUploadErrors(prev => ({ ...prev, [orderId]: null }));
                            
                            try {
                              const result = await createPayment(order._id, order.total, orderUploadFile);
                              
                              if (result.success && result.data) {
                                setPayments(prev => ({
                                  ...prev,
                                  [order._id]: result.data!
                                }));
                                setUploadFiles(prev => ({ ...prev, [orderId]: null }));
                                
                                // Check if all orders are processed
                                const allProcessed = pendingOrderIds.every(id => payments[id] || (id === orderId));
                                if (allProcessed) {
                                  setTimeout(() => {
                                    setShowUploadModal(false);
                                    setUploadFiles({});
                                    setUploadErrors({});
                                    setUploadingOrders(new Set());
                                    setPendingOrderIds([]);
                                    alert(`Toutes les preuves de paiement ont été uploadées avec succès ! (${pendingOrderIds.length} réserve${pendingOrderIds.length > 1 ? "s" : ""})`);
                                  }, 500);
                                }
                              } else {
                                setUploadErrors(prev => ({
                                  ...prev,
                                  [orderId]: result.message || "Erreur lors de l'upload"
                                }));
                              }
                            } catch (err) {
                              console.error("Upload payment error:", err);
                              setUploadErrors(prev => ({
                                ...prev,
                                [orderId]: "Une erreur est survenue. Veuillez réessayer."
                              }));
                            } finally {
                              setUploadingOrders(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(orderId);
                                return newSet;
                              });
                            }
                          }}
                          disabled={!orderUploadFile || isUploadingOrder}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isUploadingOrder ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Upload en cours...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Uploader pour ce fournisseur
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedOrder(null);
                  setUploadFiles({});
                  setUploadErrors({});
                  setUploadingOrders(new Set());
                  setPendingOrderIds([]);
                  setCurrentPendingOrderIndex(0);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6" onClick={() => {
          setShowPaymentModal(false);
          setSelectedPayment(null);
        }}>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-xl sm:rounded-t-2xl sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">Preuve de paiement</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Document de paiement de la Poste Algérienne</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Payment Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Montant</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">{selectedPayment.total.toFixed(2)} DA</p>
                </div>
                <div className="bg-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-200">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Date d'upload</p>
                  <p className="text-base sm:text-lg font-semibold text-purple-900">
                    {new Date(selectedPayment.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                  <p className="text-xs sm:text-sm text-purple-700 mt-1">
                    {new Date(selectedPayment.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-200">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Statut</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <p className="text-base sm:text-lg font-semibold text-green-900">Confirmé</p>
                  </div>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="border-t border-gray-200 pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Document PDF</p>
                    <p className="text-xs sm:text-sm text-gray-600">Preuve de paiement de la Poste Algérienne</p>
                  </div>
                  <a
                    href={getMediaUrl(`uploads/payments/${selectedPayment.image}`) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl w-full sm:w-auto justify-center"
                  >
                    <FileText className="w-4 h-4" />
                    Télécharger
                  </a>
                </div>
                <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-4 border-2 border-gray-200 shadow-inner">
                  <iframe
                    src={getMediaUrl(`uploads/payments/${selectedPayment.image}`) || ""}
                    className="w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-lg border border-gray-300"
                    title="Payment proof"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl sm:rounded-b-2xl sticky bottom-0">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm sm:text-base hover:bg-gray-300 transition-all w-full sm:w-auto"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

