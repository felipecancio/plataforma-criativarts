"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/types/product";
import { checkout as runCheckout } from "@/lib/checkout";
import { trackAddToCart } from "@/lib/analytics";
import { toProductPayload } from "@/lib/analytics/mappers";

export type CartItem = {
  productId: string;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  hasItem: (productId: string) => boolean;
  itemCount: number;
  subtotal: number;
  cartProducts: Product[];
  catalog: Product[];
  checkout: () => void | Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "criativarts-cart";

function normalizeItems(raw: unknown, catalog: Product[]): CartItem[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const next: CartItem[] = [];

  for (const entry of raw) {
    const productId =
      typeof entry === "object" &&
      entry !== null &&
      "productId" in entry &&
      typeof (entry as { productId: unknown }).productId === "string"
        ? (entry as { productId: string }).productId
        : null;

    if (!productId || seen.has(productId)) continue;
    if (!catalog.some((product) => product.id === productId)) continue;

    seen.add(productId);
    next.push({ productId });
  }

  return next;
}

export function CartProvider({
  children,
  catalog,
}: {
  children: ReactNode;
  catalog: Product[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(normalizeItems(JSON.parse(raw), catalog));
      }
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, [catalog]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const hasItem = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items]
  );

  const addItem = useCallback(
    (productId: string) => {
      const alreadyInCart = items.some((item) => item.productId === productId);

      if (!alreadyInCart) {
        setItems((prev) => [...prev, { productId }]);
        const product = catalog.find((entry) => entry.id === productId);
        if (product) {
          trackAddToCart(toProductPayload(product, 1));
        }
      }

      setIsOpen(true);
    },
    [items, catalog]
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartProducts = useMemo(() => {
    return items
      .map((item) => catalog.find((product) => product.id === item.productId))
      .filter((product): product is Product => Boolean(product));
  }, [items, catalog]);

  const itemCount = cartProducts.length;

  const subtotal = useMemo(
    () => cartProducts.reduce((sum, product) => sum + product.price, 0),
    [cartProducts]
  );

  const checkout = useCallback(async () => {
    await runCheckout(cartProducts.map((product) => ({ product, quantity: 1 })));
  }, [cartProducts]);

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      clearCart,
      hasItem,
      itemCount,
      subtotal,
      cartProducts,
      catalog,
      checkout,
    }),
    [
      items,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      clearCart,
      hasItem,
      itemCount,
      subtotal,
      cartProducts,
      catalog,
      checkout,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
