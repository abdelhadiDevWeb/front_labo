"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart, Search, Filter, Eye, Package, CheckCircle, Clock, XCircle, Loader2, ChevronLeft, ChevronRight, X, User, Store, Calendar, DollarSign } from "lucide-react";
import { getAdminOrders, AdminOrder } from "@/lib/api";

const statusLabels: { [key: string]: string } = {
  "en cours": "En cours",
  "on route": "En route",
  "arrived": "Livré",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<{ [key: string]: number }>({});
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAdminOrders({
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchQuery || undefined,
          page: currentPage,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (result.success && result.data) {
          setOrders(result.data.orders);
          setTotalPages(result.data.pagination.totalPages);
          setTotalCount(result.data.pagination.totalCount);
          setStatusCounts(result.data.filters.statusCounts);
        } else {
          setError(result.message || "Erreur lors du chargement des commandes");
        }
      } catch (err) {
        console.error("Load orders error:", err);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadOrders();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [statusFilter, searchQuery, currentPage]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " DA";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "arrived":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "en cours":
        return <Package className="w-5 h-5 text-blue-600" />;
      case "on route":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "arrived":
        return "bg-green-100 text-green-800";
      case "en cours":
        return "bg-blue-100 text-blue-800";
      case "on route":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleViewOrder = (order: AdminOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Commandes</h2>
          <p className="text-gray-500 mt-1">Suivez et gérez toutes les commandes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold">{totalCount} Commandes</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tous les statuts ({totalCount})</option>
              <option value="en cours">En cours ({statusCounts["en cours"] || 0})</option>
              <option value="on route">En route ({statusCounts["on route"] || 0})</option>
              <option value="arrived">Livré ({statusCounts["arrived"] || 0})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Chargement des commandes...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande trouvée</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Commande
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fournisseur
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produits
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customer}</div>
                        <div className="text-xs text-gray-500">{order.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.supplier}</div>
                        <div className="text-xs text-gray-500">{order.supplierEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.productCount} {order.productCount > 1 ? "produits" : "produit"}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">
                          {order.products.map((p) => p.name).join(", ")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Voir</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} sur {totalPages} ({totalCount} commandes)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Details Modal */}
      {mounted && showModal && selectedOrder && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedOrder.orderNumber}</h3>
                  <p className="text-sm text-blue-100">Détails de la commande</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(selectedOrder.status)}
                    <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {statusLabels[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Montant total</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedOrder.totalAmount)}</p>
                  </div>
                </div>

                {/* Customer and Supplier Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Card */}
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Client</h4>
                    </div>
                    <p className="text-lg font-medium text-gray-900">{selectedOrder.customer}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedOrder.customerEmail}</p>
                  </div>

                  {/* Supplier Card */}
                  <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <Store className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Fournisseur</h4>
                    </div>
                    <p className="text-lg font-medium text-gray-900">{selectedOrder.supplier}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedOrder.supplierEmail}</p>
                  </div>
                </div>

                {/* Products List */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Produits ({selectedOrder.productCount})
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.products.map((product, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500 mt-1">Quantité: {product.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Prix unitaire</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(product.price)}</p>
                          <p className="text-sm text-gray-500 mt-1">Total: {formatCurrency(product.price * product.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-500">Date de création</p>
                    </div>
                    <p className="text-gray-900 font-medium">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-500">Dernière mise à jour</p>
                    </div>
                    <p className="text-gray-900 font-medium">{formatDate(selectedOrder.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

