"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  X,
  Eye,
  Printer,
  Phone,
  FileText,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { apiFetch, checkAuthSession, getPaymentByCommande, Payment } from "@/lib/api";
import { printInvoiceSafely } from "@/lib/invoice-print";
import { io as socketIO } from "socket.io-client";
import { getApiUrl, getBaseUrl } from "@/lib/api-config";
import { getMediaUrl } from "@/lib/media-url";

interface OrderProduct {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  total: number;
  products: OrderProduct[];
  idBuyer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  } | null;
  idSupplier: string;
  status: "en cours" | "on route" | "arrived";
  createdAt: string;
  updatedAt: string;
}

export default function SupplierOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [payments, setPayments] = useState<{ [commandeId: string]: Payment }>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);
  const [alertPayment, setAlertPayment] = useState<Payment | null>(null);
  const [showConfirmStatusModal, setShowConfirmStatusModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; newStatus: "on route" | "arrived" } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [recentPaymentOrderIds, setRecentPaymentOrderIds] = useState<Set<string>>(new Set());

  // Memoize modal states to ensure consistent dependency array
  const modalStates = useMemo(() => ({
    showPaymentModal,
    showPaymentAlert,
    showConfirmStatusModal,
  }), [showPaymentModal, showPaymentAlert, showConfirmStatusModal]);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let socket: ReturnType<typeof socketIO> | null = null;
    let cancelled = false;

    const refreshOrders = () => {
      loadOrders();
    };

    const connectSocket = async () => {
      const authed = await checkAuthSession();
      if (!authed || cancelled) return;

      socket = socketIO(getBaseUrl(), {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socket.on("newOrder", refreshOrders);
      socket.on("paymentUploaded", (data: { orderId?: string }) => {
        if (data?.orderId) {
          setRecentPaymentOrderIds((prev) => {
            const next = new Set(prev);
            next.add(data.orderId as string);
            return next;
          });

          setTimeout(() => {
            setRecentPaymentOrderIds((prev) => {
              const next = new Set(prev);
              next.delete(data.orderId as string);
              return next;
            });
          }, 5000);
        }
        refreshOrders();
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("newOrder", refreshOrders);
        socket.off("paymentUploaded");
        socket.disconnect();
      }
    };
  }, []);

  // Prevent body scroll when modals are open
  useEffect(() => {
    const hasOpenModal = modalStates.showPaymentModal || modalStates.showPaymentAlert || modalStates.showConfirmStatusModal;
    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modalStates]);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const authed = await checkAuthSession();
      if (!authed) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = getApiUrl();
      const response = await apiFetch(`${API_BASE_URL}/commandes/supplier`);

      if (!response.ok) {
        throw new Error("Failed to load orders");
      }

      const result = await response.json();
      if (result.success && result.data) {
        const ordersList = result.data.orders || [];
        setOrders(ordersList);
        
        // Load payments for all orders
        const paymentsMap: { [commandeId: string]: Payment } = {};
        for (const order of ordersList) {
          try {
            const paymentResult = await getPaymentByCommande(order._id);
            if (paymentResult.success && paymentResult.data) {
              paymentsMap[order._id] = paymentResult.data;
            }
          } catch (err) {
            // Payment doesn't exist for this order, that's okay
            // No payment found for this order
          }
        }
        setPayments(paymentsMap);
      }
    } catch (err) {
      setError("Erreur lors du chargement des commandes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter((order) => order.status === statusFilter));
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: "on route" | "arrived") => {
    // Store the pending status change and show confirmation modal
    setPendingStatusChange({ orderId, newStatus });
    setShowConfirmStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    try {
      setUpdatingStatus(pendingStatusChange.orderId);

      const API_BASE_URL = getApiUrl();
      const response = await apiFetch(`${API_BASE_URL}/commandes/${pendingStatusChange.orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: pendingStatusChange.newStatus }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.message || "Erreur lors de la mise à jour du statut");
        setShowConfirmStatusModal(false);
        setPendingStatusChange(null);
        setUpdatingStatus(null);
        return;
      }

      // Reload orders to get updated data
      await loadOrders();
      
      // Close confirmation modal
      setShowConfirmStatusModal(false);
      setPendingStatusChange(null);

      // If changing to "on route" and payment exists, show success alert
      if (pendingStatusChange.newStatus === "on route") {
        const payment = payments[pendingStatusChange.orderId];
        if (payment) {
          setAlertPayment(payment);
          setShowPaymentAlert(true);
        }
      }
    } catch (err) {
      alert("Une erreur est survenue");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handlePrintInvoice = (order: Order) => {
    printInvoiceSafely(order);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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
    const styles = {
      "en cours": "bg-blue-100 text-blue-700 border-blue-300",
      "on route": "bg-orange-100 text-orange-700 border-orange-300",
      "arrived": "bg-green-100 text-green-700 border-green-300",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard-supplier"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Mes Commandes</h1>
                  <p className="text-sm text-gray-600">
                    {orders.length} commande{orders.length > 1 ? "s" : ""} au total
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
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Toutes
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {orders.length === 0 ? "Aucune commande" : "Aucune commande trouvée"}
            </h3>
            <p className="text-gray-600">
              {orders.length === 0
                ? "Aucune commande n'a été passée pour le moment"
                : "Essayez de modifier vos filtres"}
            </p>
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
                          Commande #{order._id.slice(-8).toUpperCase()}
                        </h3>
                        {getStatusBadge(order.status)}
                      </div>
                      {order.idBuyer ? (
                        <>
                          <p className="text-sm text-gray-600">
                            Client: {order.idBuyer.firstName} {order.idBuyer.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            Email: {order.idBuyer.email}
                          </p>
                          {order.idBuyer.phone && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {order.idBuyer.phone}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Informations client non disponibles
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Date: {new Date(order.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {order.total.toFixed(2)} DA
                      </p>
                    </div>
                  </div>

                  {/* Products List */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Produits:</h4>
                    <div className="space-y-2">
                      {order.products.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
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
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <h4 className="font-semibold text-gray-900">Preuve de paiement:</h4>
                      {recentPaymentOrderIds.has(order._id) && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300 animate-pulse">
                          Preuve recue maintenant
                        </span>
                      )}
                    </div>
                    {payments[order._id] ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700 font-medium flex-1">Preuve de paiement reçue</span>
                        <button
                          onClick={() => {
                            setSelectedPayment(payments[order._id]);
                            setShowPaymentModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          Voir les détails
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-yellow-700">Le paiement n'a pas encore été effectué</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    {/* Status Update Actions */}
                    <div className="flex items-center gap-3">
                      {order.status === "en cours" && (
                        <button
                          onClick={() => updateOrderStatus(order._id, "on route")}
                          disabled={updatingStatus === order._id}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingStatus === order._id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Mise à jour...
                            </>
                          ) : (
                            <>
                              <Truck className="w-4 h-4" />
                              Marquer comme "En route"
                            </>
                          )}
                        </button>
                      )}
                      {order.status === "on route" && (
                        <button
                          onClick={() => updateOrderStatus(order._id, "arrived")}
                          disabled={updatingStatus === order._id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingStatus === order._id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Mise à jour...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Marquer comme "Arrivée"
                            </>
                          )}
                        </button>
                      )}
                      {order.status === "arrived" && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Commande livrée</span>
                        </div>
                      )}
                    </div>

                    {/* Print Invoice Button */}
                    <button
                      onClick={() => handlePrintInvoice(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Payment Details Modal */}
      {isMounted &&
        showPaymentModal &&
        selectedPayment &&
        createPortal(
        <>
          <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2147483646] transition-opacity animate-fade-in"
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedPayment(null);
            }}
          />
            <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl sm:rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">Détails de la preuve de paiement</h3>
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
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-green-700 transition-all shadow-lg hover:shadow-xl w-full sm:w-auto justify-center"
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
          </>,
          document.body
      )}

      {/* Confirmation Modal Before Status Change */}
      {isMounted &&
        showConfirmStatusModal &&
        pendingStatusChange &&
        createPortal(
        <>
          <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2147483646] transition-opacity animate-fade-in"
            onClick={() => {
              setShowConfirmStatusModal(false);
              setPendingStatusChange(null);
            }}
          />
            <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10 ${payments[pendingStatusChange.orderId] ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-yellow-600 to-orange-600'}`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0`}>
                  {payments[pendingStatusChange.orderId] ? (
                    <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">
                    Confirmer le changement de statut
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90 mt-1">
                    {pendingStatusChange.newStatus === "on route" ? "Mettre la commande en route" : "Marquer la commande comme arrivée"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Payment Info if exists */}
              {payments[pendingStatusChange.orderId] ? (
                <>
                  <div className="bg-green-50 rounded-lg sm:rounded-xl p-4 sm:p-5 border-2 border-green-200">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                      <p className="font-semibold text-sm sm:text-base text-green-900">Preuve de paiement disponible</p>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 py-2 border-b border-green-200">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                          <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          Montant:
                        </span>
                        <span className="text-base sm:text-lg font-bold text-green-900">{payments[pendingStatusChange.orderId].total.toFixed(2)} DA</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 py-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          Date d'upload:
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                          {new Date(payments[pendingStatusChange.orderId].createdAt).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPayment(payments[pendingStatusChange.orderId]);
                        setShowPaymentModal(true);
                        setShowConfirmStatusModal(false);
                      }}
                      className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Voir le document complet
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 text-center">
                    La preuve de paiement a été vérifiée. Êtes-vous sûr de vouloir {pendingStatusChange.newStatus === "on route" ? "mettre cette commande en route" : "marquer cette commande comme arrivée"} ?
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-yellow-50 rounded-lg sm:rounded-xl p-4 sm:p-5 border-2 border-yellow-200">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
                      <p className="font-semibold text-sm sm:text-base text-yellow-900">Aucune preuve de paiement</p>
                    </div>
                    <p className="text-xs sm:text-sm text-yellow-800">
                      Aucune preuve de paiement n'a été uploadée pour cette commande. Voulez-vous quand même {pendingStatusChange.newStatus === "on route" ? "mettre la commande en route" : "marquer la commande comme arrivée"} ?
                    </p>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowConfirmStatusModal(false);
                    setPendingStatusChange(null);
                  }}
                  className="flex-1 px-4 py-2 sm:py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm sm:text-base hover:bg-gray-300 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmStatusChange}
                  disabled={updatingStatus === pendingStatusChange.orderId}
                  className={`flex-1 px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    payments[pendingStatusChange.orderId]
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-yellow-600 text-white hover:bg-yellow-700"
                  }`}
                >
                  {updatingStatus === pendingStatusChange.orderId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Oui, confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
          </>,
          document.body
      )}

      {/* Payment Alert Modal (when confirming order to on route) */}
      {isMounted &&
        showPaymentAlert &&
        alertPayment &&
        createPortal(
        <>
          <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2147483646] transition-opacity animate-fade-in"
            onClick={() => {
              setShowPaymentAlert(false);
              setAlertPayment(null);
            }}
          />
            <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">Preuve de paiement confirmée</h3>
                  <p className="text-xs sm:text-sm text-green-100 mt-1">
                    Commande mise en route avec succès
                  </p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-gray-600">
                La commande a été confirmée et mise en route. Voici les détails de la preuve de paiement :
              </p>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg sm:rounded-xl p-4 sm:p-5 border-2 border-green-200 space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 py-2 border-b border-green-200">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    Montant:
                  </span>
                  <span className="text-base sm:text-lg font-bold text-green-900">{alertPayment.total.toFixed(2)} DA</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 py-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    Date d'upload:
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                    {new Date(alertPayment.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPaymentAlert(false);
                    setAlertPayment(null);
                  }}
                  className="flex-1 px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
                >
                  OK
                </button>
                <button
                  onClick={() => {
                    setSelectedPayment(alertPayment);
                    setShowPaymentModal(true);
                    setShowPaymentAlert(false);
                    setAlertPayment(null);
                  }}
                  className="flex-1 px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Eye className="w-4 h-4" />
                  Voir le document
                </button>
              </div>
            </div>
          </div>
          </div>
          </>,
          document.body
      )}
    </div>
  );
}
