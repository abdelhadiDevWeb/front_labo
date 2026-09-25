"use client";

import { X, ShoppingCart, Trash2, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { apiFetch, checkAuthSession } from "@/lib/api";
import { getApiUrl } from "@/lib/api-config";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartPanel({ isOpen, onClose }: CartPanelProps) {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearReservableItems } = useCart();
  const [showInvoice, setShowInvoice] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const router = useRouter();

  // Reset invoice view when panel closes
  useEffect(() => {
    if (!isOpen) {
      setShowInvoice(false);
    }
  }, [isOpen]);

  const subtotal = getTotalPrice();
  const finalTotal = subtotal; // No TVA

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setShowInvoice(true);
  };

  const handleBuy = async () => {
    const authenticated = await checkAuthSession();
    if (!authenticated) {
      alert("Veuillez vous connecter pour confirmer votre achat");
      return;
    }

    setIsCreatingOrder(true);

    try {
      const API_BASE_URL = getApiUrl();

      const reservableCartItems = cartItems.filter((item) => {
        const type = item.itemType || "product";
        return type === "product" || type === "machine";
      });

      if (reservableCartItems.length === 0) {
        alert("Votre panier ne contient aucun article à réserver.");
        setIsCreatingOrder(false);
        return;
      }

      const resolveSupplierId = async (
        item: (typeof cartItems)[0]
      ): Promise<string | null> => {
        const itemType = item.itemType === "machine" ? "machine" : "product";
        if (item.supplierId && String(item.supplierId).trim()) {
          return String(item.supplierId).trim();
        }

        try {
          const endpoint =
            itemType === "machine"
              ? `${API_BASE_URL}/machines/public/${item.id}`
              : `${API_BASE_URL}/products/public/${item.id}`;
          const catalogResponse = await apiFetch(endpoint);
          if (!catalogResponse.ok) return null;
          const catalogData = await catalogResponse.json();
          const supplierId =
            catalogData?.data?.supplier?.id ||
            catalogData?.data?.supplierId ||
            null;
          return supplierId ? String(supplierId) : null;
        } catch (err) {
          console.error("Error fetching catalog item:", err);
          return null;
        }
      };

      // Create one reserve request per cart line when supplier is unknown —
      // backend resolves the real supplier from the catalog document.
      const orderIds: string[] = [];
      const errors: string[] = [];

      const itemsBySupplier: {
        [key: string]: Array<{
          id: string | number;
          quantity: number;
          itemType: "product" | "machine";
        }>;
      } = {};

      for (const item of reservableCartItems) {
        const itemType = item.itemType === "machine" ? "machine" : "product";
        const supplierId = (await resolveSupplierId(item)) || `__solo_${itemType}_${item.id}`;
        if (!itemsBySupplier[supplierId]) itemsBySupplier[supplierId] = [];
        itemsBySupplier[supplierId].push({
          id: item.id,
          quantity: item.quantity || 1,
          itemType,
        });
      }

      for (const [, products] of Object.entries(itemsBySupplier)) {
        try {
          const response = await apiFetch(`${API_BASE_URL}/commandes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ products }),
          });

          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            errors.push(
              result.message ||
                (response.status === 403
                  ? "Compte non autorisé à réserver (abonnement / activation)."
                  : `Erreur serveur (${response.status})`)
            );
            continue;
          }

          const orderId =
            result.orderId ||
            result.data?._id ||
            result.data?.id ||
            null;
          if (result.success && orderId) {
            orderIds.push(String(orderId));
          } else if (result.success) {
            // Created but id missing — still count as success for navigation
            orderIds.push("ok");
          } else {
            errors.push(result.message || "Création de réserve échouée");
          }
        } catch (err) {
          console.error("Error creating order:", err);
          errors.push("Erreur réseau lors de la création de la réserve");
        }
      }

      if (orderIds.length > 0) {
        setShowInvoice(false);
        clearReservableItems();
        onClose();
        router.push("/orders");
        return;
      }

      alert(
        errors.length > 0
          ? `Aucune réserve n'a pu être créée:\n${errors.join("\n")}`
          : "Aucune réserve n'a pu être créée. Veuillez réessayer."
      );
    } catch (err) {
      console.error("Create order error:", err);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCancelInvoice = () => {
    setShowInvoice(false);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Panier</h2>
              {cartItems.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Invoice View */}
          {showInvoice ? (
            <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
              <div className="mb-6">
                <button
                  onClick={handleCancelInvoice}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                >
                  <X className="w-4 h-4" />
                  <span>Retour au panier</span>
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Réserve</h3>
                </div>
              </div>

              {/* Invoice Header */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 mb-6 border border-blue-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">MarketLab</h4>
                    <p className="text-sm text-gray-600">Marketplace des laboratoires</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date().toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Articles commandés</h4>
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    // Handle both string and number prices
                    let itemPrice: number;
                    if (typeof item.price === "number") {
                      itemPrice = item.price;
                    } else if (typeof item.price === "string") {
                      itemPrice = parseFloat(item.price.replace("€", "").replace("DA", "").replace(",", ".").trim());
                    } else {
                      itemPrice = 0;
                    }
                    
                    if (isNaN(itemPrice)) itemPrice = 0;
                    
                    const itemTotal = itemPrice * item.quantity;
                    const displayPrice = typeof item.price === "number" 
                      ? `${item.price.toFixed(2)} DA` 
                      : item.price;
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-gray-900">{item.name}</h5>
                            {(item.itemType || "product") === "machine" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                                Machine
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {displayPrice} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{itemTotal.toFixed(2)} DA</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoice Totals */}
              <div className="border-t border-gray-300 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-blue-600">{finalTotal.toFixed(2)} DA</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleBuy}
                  disabled={isCreatingOrder}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCreatingOrder ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Création de la réserve...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      Confirmer l'achat
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelInvoice}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6">
                {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  Votre panier est vide
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Ajoutez des articles pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => {
                    const type = item.itemType || "product";
                    return (
                  <div
                    key={`${type}-${item.id}`}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        {type === "machine" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                            Machine
                          </span>
                        )}
                      </div>
                      <p className="text-blue-600 font-bold text-lg mb-3">
                        {typeof item.price === "number" 
                          ? `${item.price.toFixed(2)} DA` 
                          : item.price}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Quantité:</span>
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1, type)
                            }
                            className="px-3 py-1 hover:bg-gray-200 transition-colors text-gray-700"
                          >
                            −
                          </button>
                          <span className="px-3 py-1 min-w-[2rem] text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1, type)
                            }
                            className="px-3 py-1 hover:bg-gray-200 transition-colors text-gray-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id, type)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                    );
                })}
              </div>
            )}
          </div>

              {/* Footer with Total */}
              {cartItems.length > 0 && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-700">
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {subtotal.toFixed(2)} DA
                    </span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Passer la réserve
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

