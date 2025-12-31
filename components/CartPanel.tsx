"use client";

import { X, ShoppingCart, Trash2, FileText, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface CartItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
}

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartPanel({ isOpen, onClose }: CartPanelProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);

  // Load cart from localStorage on mount and when panel opens
  const loadCart = () => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (error) {
          console.error("Error parsing cart:", error);
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  // Reload cart when panel opens and reset invoice view
  useEffect(() => {
    if (isOpen) {
      loadCart();
    } else {
      setShowInvoice(false);
    }
  }, [isOpen]);

  // Listen for storage changes and custom cart update events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cart") {
        loadCart();
      }
    };

    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cartUpdated", handleCartUpdate);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const removeItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace("€", "").replace(",", "."));
      return total + price * item.quantity;
    }, 0);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace("€", "").replace(",", "."));
      return total + price * item.quantity;
    }, 0);
  };

  const total = calculateTotal();
  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.2; // 20% TVA (example)
  const finalTotal = subtotal + tax;

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setShowInvoice(true);
  };

  const handleBuy = () => {
    alert("Le paiement en ligne sera disponible très bientôt ! 🚀\n\nNous travaillons sur l'intégration d'un système de paiement sécurisé.");
    setShowInvoice(false);
    setCartItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
    }
    onClose();
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
                  <h3 className="text-2xl font-bold text-gray-900">Facture</h3>
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
                    const itemPrice = parseFloat(item.price.replace("€", "").replace(",", "."));
                    const itemTotal = itemPrice * item.quantity;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900">{item.name}</h5>
                          <p className="text-sm text-gray-600">
                            {item.price} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{itemTotal.toFixed(2)}€</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoice Totals */}
              <div className="border-t border-gray-300 pt-4 space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Sous-total</span>
                  <span className="font-medium">{subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>TVA (20%)</span>
                  <span className="font-medium">{tax.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-300">
                  <span>Total</span>
                  <span className="text-blue-600">{finalTotal.toFixed(2)}€</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleBuy}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-6 h-6" />
                  Confirmer l'achat
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
                  Ajoutez des produits pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.name}
                      </h3>
                      <p className="text-blue-600 font-bold text-lg mb-3">
                        {item.price}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Quantité:</span>
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
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
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="px-3 py-1 hover:bg-gray-200 transition-colors text-gray-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
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
                      {total.toFixed(2)}€
                    </span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Passer la commande
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

