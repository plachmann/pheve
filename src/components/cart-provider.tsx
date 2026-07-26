"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { addItem, cartItemSchema, removeItem, setQuantity, type CartItem } from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  /**
   * False until the stored cart has been read from localStorage. Consumers that
   * mutate the cart from an effect on mount must wait for this, because the
   * hydration effect below runs after child effects and would overwrite them.
   */
  loaded: boolean;
  add: (item: CartItem) => void;
  remove: (slug: string, variant: string) => void;
  setQty: (slug: string, variant: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "pheve-cart";

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = z.array(cartItemSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadStoredCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const value: CartContextValue = {
    items,
    loaded,
    add: (item) => setItems((cart) => addItem(cart, item)),
    remove: (slug, variant) => setItems((cart) => removeItem(cart, slug, variant)),
    setQty: (slug, variant, quantity) =>
      setItems((cart) => setQuantity(cart, slug, variant, quantity)),
    clear: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
