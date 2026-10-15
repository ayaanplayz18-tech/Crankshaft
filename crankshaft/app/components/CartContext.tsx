"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  category?: string;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (product: {
    _id?: string;
    id?: string;
    name: string;
    price: number;
    imageUrl: string;
    category?: string;
  }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  comboDiscount: number;
  finalTotal: number;
  hasDealApplied: boolean;
  dealPair: [CartItem, CartItem] | null;
  qualifyingCategories: [string, string] | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "crankshaft_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Synchronize cart items with live database prices and details
  const syncCartWithDatabase = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) return;
      const data = await res.json();
      const products: any[] = data.products || [];
      if (!products.length) return;

      const prodMap = new Map<string, any>();
      for (const p of products) {
        if (p._id) prodMap.set(String(p._id), p);
        if (p.id) prodMap.set(String(p.id), p);
      }

      setItems((prev) => {
        let hasChanges = false;
        const updated = prev.map((item) => {
          const dbProd = prodMap.get(item.id);
          if (dbProd) {
            const livePrice = Number(dbProd.price);
            const liveName = dbProd.name || item.name;
            const liveImage = dbProd.imageUrl || item.imageUrl;
            const liveCategory = dbProd.category || item.category;
            if (
              item.price !== livePrice ||
              item.name !== liveName ||
              item.imageUrl !== liveImage ||
              item.category !== liveCategory
            ) {
              hasChanges = true;
              return {
                ...item,
                price: livePrice,
                name: liveName,
                imageUrl: liveImage,
                category: liveCategory,
              };
            }
          }
          return item;
        });
        return hasChanges ? updated : prev;
      });
    } catch (err) {
      console.warn("[CART_SYNC_PRICE_ERROR]", err);
    }
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("[CART_STORAGE_READ]", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sync prices with database once cart is initialized and whenever items exist
  useEffect(() => {
    if (isInitialized && items.length > 0) {
      syncCartWithDatabase();
    }
  }, [isInitialized, items.length, syncCartWithDatabase]);

  // Re-sync prices whenever cart drawer is opened
  useEffect(() => {
    if (isOpen && items.length > 0) {
      syncCartWithDatabase();
    }
  }, [isOpen, items.length, syncCartWithDatabase]);

  // Save to localStorage on change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("[CART_STORAGE_SAVE]", e);
    }
  }, [items, isInitialized]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addToCart = (product: {
    _id?: string;
    id?: string;
    name: string;
    price: number;
    imageUrl: string;
    category?: string;
  }) => {
    const productId = product._id || product.id || String(Date.now());
    const incomingPrice = Number(product.price);
    const category = product.category;
    setItems((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing) {
        return prev.map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity + 1,
                price: incomingPrice, // Always refresh with current product price
                name: product.name || item.name,
                imageUrl: product.imageUrl || item.imageUrl,
                category: category || item.category,
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: productId,
          name: product.name,
          price: incomingPrice,
          imageUrl: product.imageUrl,
          quantity: 1,
          category,
        },
      ];
    });
    setIsOpen(true); // Open the cart drawer automatically on add
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(
      (prev) =>
        prev
          .map((item) => {
            if (item.id === id) {
              const nextQty = item.quantity + delta;
              return nextQty > 0 ? { ...item, quantity: nextQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const clearCart = () => setItems([]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const comboDiscount = 0;
  const finalTotal = subtotal;
  const hasDealApplied = false;

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
        comboDiscount,
        finalTotal,
        hasDealApplied,
        dealPair: null,
        qualifyingCategories: null,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
