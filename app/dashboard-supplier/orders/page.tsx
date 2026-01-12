"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { getAuthToken } from "@/lib/api";
import { io as socketIO } from "socket.io-client";

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

  useEffect(() => {
    loadOrders();
    setupSocketConnection();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${API_BASE_URL}/commandes/supplier`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load orders");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setOrders(result.data.orders || []);
      }
    } catch (err) {
      console.error("Load orders error:", err);
      setError("Erreur lors du chargement des commandes");
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketConnection = () => {
    const token = getAuthToken();
    if (!token) return;

    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000", {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.io for orders");
    });

    socket.on("newOrder", () => {
      // Reload orders when new order arrives
      loadOrders();
    });

    return () => {
      socket.disconnect();
    };
  };

  const filterOrders = () => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter((order) => order.status === statusFilter));
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: "on route" | "arrived") => {
    try {
      setUpdatingStatus(orderId);
      const token = getAuthToken();
      if (!token) return;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${API_BASE_URL}/commandes/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.message || "Erreur lors de la mise à jour du statut");
        return;
      }

      // Reload orders to get updated data
      await loadOrders();
    } catch (err) {
      console.error("Update status error:", err);
      alert("Une erreur est survenue");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handlePrintInvoice = (order: Order) => {
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
              border-bottom: 3px solid #16a34a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .invoice-header h1 {
              color: #16a34a;
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
              color: #16a34a;
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
              background: #16a34a;
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
              color: #16a34a;
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
              <h3>Client</h3>
              ${order.idBuyer ? `
                <p><strong>${order.idBuyer.firstName} ${order.idBuyer.lastName}</strong></p>
                <p>${order.idBuyer.email}</p>
                ${order.idBuyer.phone ? `<p>Tél: ${order.idBuyer.phone}</p>` : ""}
              ` : `
                <p><em>Informations client non disponibles</em></p>
              `}
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
    </div>
  );
}
