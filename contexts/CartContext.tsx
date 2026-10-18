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
  /** Stock known when the item was added; quantities are capped to it. */
  maxQuantity?: number;
  /** Set when added from a promotion — the backend re-validates it and applies the offer. */
  promotionId?: string;
  /** Promotion minimum quantity; the line cannot go below it. */
  minQuantity?: number;
  /** Minimum set by the supplier; larger than `minQuantity` when stock is below it. */
  offerMinQuantity?: number;
  /** Catalog price before the promotion discount. */
  normalPrice?: number;
  /** Item given free with the promotion. */
  freeGiftName?: string;
}

const capQuantity = (quantity: number, maxQuantity?: number) =>
  typeof maxQuantity === "number" && Number.isFinite(maxQuantity) && maxQuantity > 0
    ? Math.min(quantity, maxQuantity)
    : quantity;

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
  /** Clear products and machines (checkoutable cart lines). */
  clearReservableItems: () => void;
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
        return prev.map((cartItem) => {
          if (!(cartItem.id === item.id && (cartItem.itemType || "product") === itemType)) {
            return cartItem;
          }
          const maxQuantity = item.maxQuantity ?? cartItem.maxQuantity;
          const promo = item.promotionId
            ? {
                name: item.name,
                price: item.price,
                promotionId: item.promotionId,
                minQuantity: item.minQuantity,
                offerMinQuantity: item.offerMinQuantity,
                normalPrice: item.normalPrice,
                freeGiftName: item.freeGiftName,
              }
            : {};
          const minQuantity = item.promotionId ? item.minQuantity : cartItem.minQuantity;
          // A promotion add never stacks: the line starts at the offer minimum (or keeps a larger quantity).
          const nextQuantity = item.promotionId
            ? Math.max(cartItem.quantity, minQuantity ?? 1)
            : Math.max(cartItem.quantity + quantity, minQuantity ?? 1);
          return {
            ...cartItem,
            ...promo,
            maxQuantity,
            quantity: capQuantity(nextQuantity, maxQuantity),
          };
        });
      } else {
        return [
          ...prev,
          {
            ...item,
            itemType,
            quantity: capQuantity(Math.max(quantity, item.minQuantity ?? 1), item.maxQuantity),
          },
        ];
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
          ? {
              ...item,
              quantity: capQuantity(Math.max(quantity, item.minQuantity ?? 1), item.maxQuantity),
            }
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

  const clearReservableItems = () => {
    setCartItems((prev) =>
      prev.filter((item) => {
        const type = item.itemType || "product";
        return type !== "product" && type !== "machine";
      })
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
        clearReservableItems,
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

