"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Package, Loader2, ArrowLeft, CheckCircle, Truck, Clock, Filter, Printer, Phone, Upload, FileText, X, Eye, Building2, Mail } from "lucide-react";
import { getAuthToken, createPayment, getPaymentByCommande, Payment } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { getApiUrl, getBaseUrl } from "@/lib/api-config";

interface Order {
  _id: string;
  total: number;
  products: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  idBuyer: string;
  idSupplier: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  status: "en cours" | "on route" | "arrived";
  createdAt: string;
  updatedAt: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
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

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const role = payload.role;
        
        // Only allow clients to access this page
        if (role !== "client") {
          router.push("/home");
          return;
        }

        setIsAuthenticated(true);
        await loadOrders();
      } catch (error) {
        console.error("Error decoding token:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);
  
  // Check URL params for payment upload (single or multiple orders)
  useEffect(() => {
    if (typeof window !== "undefined" && orders.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("orderId"); // Single order (backward compatibility)
      const orderIdsParam = params.get("orderIds"); // Multiple orders (comma-separated)
      const uploadPayment = params.get("uploadPayment");
      
      if (uploadPayment === "true") {
        // Clean URL first
        router.replace("/orders");
        
        if (orderIdsParam) {
          // Multiple orders - store pending order IDs and show all at once
          const orderIds = orderIdsParam.split(",").filter(id => id.trim());
          setPendingOrderIds(orderIds);
          setShowUploadModal(true);
          // Initialize upload files and errors for all orders
          const files: { [orderId: string]: File | null } = {};
          const errors: { [orderId: string]: string | null } = {};
          orderIds.forEach(id => {
            files[id] = null;
            errors[id] = null;
          });
          setUploadFiles(files);
          setUploadErrors(errors);
        } else if (orderId) {
          // Single order (backward compatibility)
          const order = orders.find(o => o._id === orderId);
          if (order) {
            setSelectedOrder(order);
            setPendingOrderIds([orderId]);
            setUploadFiles({ [orderId]: null });
            setUploadErrors({ [orderId]: null });
            setShowUploadModal(true);
          }
        }
      }
    }
  }, [orders, router]);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showUploadModal || showPaymentModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showUploadModal, showPaymentModal]);

  const loadOrders = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const API_BASE_URL = getApiUrl();
      const response = await fetch(`${API_BASE_URL}/commandes/client`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
            console.log(`No payment found for order ${order._id}`);
          }
        }
        setPayments(paymentsMap);
      }
    } catch (err) {
      console.error("Load orders error:", err);
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
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture - Commande ${order._id.slice(-8).toUpperCase()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #333;
            }
            .invoice-header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .invoice-header h1 {
              color: #2563eb;
              font-size: 28px;
              margin-bottom: 10px;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-section h3 {
              color: #2563eb;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .info-section p {
              margin: 5px 0;
              font-size: 14px;
            }
            .products-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .products-table th {
              background: #2563eb;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            .products-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .products-table tr:hover {
              background: #f9fafb;
            }
            .total-section {
              text-align: right;
              margin-top: 20px;
            }
            .total-section .total-amount {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-top: 10px;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-en-cours { background: #dbeafe; color: #1e40af; }
            .status-on-route { background: #fed7aa; color: #9a3412; }
            .status-arrived { background: #d1fae5; color: #065f46; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>FACTURE</h1>
            <p>Commande #${order._id.slice(-8).toUpperCase()}</p>
            <p>Date: ${new Date(order.createdAt).toLocaleString("fr-FR")}</p>
          </div>
          
          <div class="invoice-info">
            <div class="info-section">
              <h3>Fournisseur</h3>
              <p><strong>${order.idSupplier.firstName} ${order.idSupplier.lastName}</strong></p>
              <p>${order.idSupplier.email}</p>
              ${order.idSupplier.phone ? `<p>Tél: ${order.idSupplier.phone}</p>` : ""}
            </div>
            <div class="info-section">
              <h3>Statut</h3>
              <span class="status-badge status-${order.status.replace(" ", "-")}">${order.status}</span>
            </div>
          </div>

          <table class="products-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix unitaire</th>
                <th>Quantité</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.products.map((product) => `
                <tr>
                  <td>${product.name}</td>
                  <td>${product.price.toFixed(2)} DA</td>
                  <td>${product.quantity}</td>
                  <td>${(product.price * product.quantity).toFixed(2)} DA</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="total-section">
            <p><strong>Total: <span class="total-amount">${order.total.toFixed(2)} DA</span></strong></p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
                    ? "bg-blue-600 text-white shadow-lg"
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
        {/* Hidden print area */}
        <div ref={printRef} className="hidden" />

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Aucune commande</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Vous n'avez pas encore passé de commande. Parcourez notre marketplace pour découvrir nos services.
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
                          Commande #{order._id.slice(-8).toUpperCase()}
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
                    <h4 className="font-semibold text-gray-900 mb-3">Preuve de paiement:</h4>
                    {payments[order._id] ? (
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

                  {/* Print Invoice Button */}
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handlePrintInvoice(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer la facture
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Payment Modal - Show all orders at once */}
      {showUploadModal && pendingOrderIds.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Uploader les preuves de paiement</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {pendingOrderIds.length} commande{pendingOrderIds.length > 1 ? "s" : ""} nécessite{pendingOrderIds.length > 1 ? "nt" : ""} une preuve de paiement
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
                                Commande #{order._id.slice(-8).toUpperCase()}
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
                                    alert(`Toutes les preuves de paiement ont été uploadées avec succès ! (${pendingOrderIds.length} commande${pendingOrderIds.length > 1 ? "s" : ""})`);
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => {
          setShowPaymentModal(false);
          setSelectedPayment(null);
        }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Preuve de paiement</h3>
                  <p className="text-sm text-gray-600">Document de paiement de la Poste Algérienne</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Payment Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Montant</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedPayment.total.toFixed(2)} DA</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Date d'upload</p>
                  <p className="text-lg font-semibold text-purple-900">
                    {new Date(selectedPayment.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    {new Date(selectedPayment.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Statut</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-lg font-semibold text-green-900">Confirmé</p>
                  </div>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-1">Document PDF</p>
                    <p className="text-sm text-gray-600">Preuve de paiement de la Poste Algérienne</p>
                  </div>
                  <a
                    href={`${getBaseUrl()}/uploads/payments/${selectedPayment.image}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-4 h-4" />
                    Télécharger
                  </a>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 shadow-inner">
                  <iframe
                    src={`${getBaseUrl()}/uploads/payments/${selectedPayment.image}`}
                    className="w-full h-[600px] rounded-lg border border-gray-300"
                    title="Payment proof"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
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

