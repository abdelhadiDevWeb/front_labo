"use client";

import { CartProvider } from "@/contexts/CartContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
