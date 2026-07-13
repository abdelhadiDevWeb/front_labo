"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  id: string | number;
  name: string;
  price: string | number;
  quantity: number;
  supplierId?: string;
  /** Defaults to product when omitted (legacy cart entries). */
  itemType?: "product" | "machine" | "service";
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeFromCart: (id: string | number, itemType?: CartItem["itemType"]) => void;
  updateQuantity: (
    id: string | number,
    quantity: number,
    itemType?: CartItem["itemType"]
  ) => void;
  clearCart: () => void;
  clearProductItems: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          setCartItems(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
          console.error("Error parsing cart:", error);
          setCartItems([]);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [cartItems, isLoaded]);

  const addToCart = (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
    const itemType = item.itemType || "product";
    setCartItems((prev) => {
      const existingItem = prev.find(
        (cartItem) =>
          cartItem.id === item.id &&
          (cartItem.itemType || "product") === itemType
      );

      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === item.id && (cartItem.itemType || "product") === itemType
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        return [...prev, { ...item, itemType, quantity }];
      }
    });
  };

  const removeFromCart = (id: string | number, itemType?: CartItem["itemType"]) => {
    const type = itemType || "product";
    setCartItems((prev) =>
      prev.filter(
        (item) => !(item.id === id && (item.itemType || "product") === type)
      )
    );
  };

  const updateQuantity = (
    id: string | number,
    quantity: number,
    itemType?: CartItem["itemType"]
  ) => {
    const type = itemType || "product";
    if (quantity <= 0) {
      removeFromCart(id, type);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id && (item.itemType || "product") === type
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
    }
  };

  const clearProductItems = () => {
    setCartItems((prev) =>
      prev.filter((item) => (item.itemType || "product") !== "product")
    );
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      // Handle both string and number prices
      let price: number;
      if (typeof item.price === "number") {
        price = item.price;
      } else if (typeof item.price === "string") {
        // Remove currency symbols and convert comma to dot
        price = parseFloat(item.price.replace("€", "").replace("DA", "").replace(",", ".").trim());
      } else {
        price = 0;
      }
      
      // Ensure price is a valid number
      if (isNaN(price)) {
        console.warn(`Invalid price for item ${item.id}:`, item.price);
        price = 0;
      }
      
      return total + price * item.quantity;
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        clearProductItems,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

