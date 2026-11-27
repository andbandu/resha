"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_STORE_CONFIG,
  fetchCategories,
  fetchPromos,
  fetchStoreConfig,
  getS3ImageUrl,
  validatePromoCode,
} from "@/lib/catalog";
import type {
  CartItem,
  CategoryItem,
  Product,
  ProductColor,
  PromoCode,
  SizeOption,
  StoreConfig,
} from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  wishlist: string[];
  appliedPromo: PromoCode | null;
  availablePromos: PromoCode[];
  storeConfig: StoreConfig;
  categories: CategoryItem[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  isCartOpen: boolean;
  isHydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    product: Product,
    color: ProductColor,
    size: SizeOption,
    quantity?: number,
    openDrawer?: boolean
  ) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  applyPromoCode: (rawCode: string) => Promise<{ ok: boolean; message: string }>;
  removePromoCode: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
}

const CART_STORAGE_KEY = "resha_cart_items_v1";
const WISHLIST_STORAGE_KEY = "resha_wishlist_v1";
const PROMO_STORAGE_KEY = "resha_promo_v1";

const EMPTY_CART: CartItem[] = [];
const EMPTY_WISHLIST: string[] = [];

const listeners = new Set<() => void>();

function emitStoreChange() {
  listeners.forEach((listener) => listener());
}

function subscribeToStore(callback: () => void) {
  listeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

let cachedCartRaw: string | null = null;
let cachedCartParsed: CartItem[] = EMPTY_CART;

function getCartSnapshot(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw === cachedCartRaw) return cachedCartParsed;
    cachedCartRaw = raw;
    if (!raw) {
      cachedCartParsed = EMPTY_CART;
      return cachedCartParsed;
    }
    const parsed = JSON.parse(raw);
    cachedCartParsed = Array.isArray(parsed)
      ? parsed.map((item: CartItem) => ({
          ...item,
          image: item.image ? getS3ImageUrl(item.image) : "",
        }))
      : EMPTY_CART;
    return cachedCartParsed;
  } catch {
    return EMPTY_CART;
  }
}

function getCartServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

let cachedWishlistRaw: string | null = null;
let cachedWishlistParsed: string[] = EMPTY_WISHLIST;

function getWishlistSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (raw === cachedWishlistRaw) return cachedWishlistParsed;
    cachedWishlistRaw = raw;
    if (!raw) {
      cachedWishlistParsed = EMPTY_WISHLIST;
      return cachedWishlistParsed;
    }
    const parsed = JSON.parse(raw);
    cachedWishlistParsed = Array.isArray(parsed) ? parsed : EMPTY_WISHLIST;
    return cachedWishlistParsed;
  } catch {
    return EMPTY_WISHLIST;
  }
}

function getWishlistServerSnapshot(): string[] {
  return EMPTY_WISHLIST;
}

let cachedPromoRaw: string | null = null;
let cachedPromoParsed: PromoCode | null = null;

function getPromoSnapshot(): PromoCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROMO_STORAGE_KEY);
    if (raw === cachedPromoRaw) return cachedPromoParsed;
    cachedPromoRaw = raw;
    if (!raw) {
      cachedPromoParsed = null;
      return null;
    }
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.code === "string" &&
      (parsed.type === "percent" || parsed.type === "fixed") &&
      typeof parsed.value === "number"
    ) {
      cachedPromoParsed = parsed as PromoCode;
      return cachedPromoParsed;
    }
    cachedPromoParsed = null;
    return null;
  } catch {
    cachedPromoParsed = null;
    return null;
  }
}

function getPromoServerSnapshot(): PromoCode | null {
  return null;
}

function getHydratedSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

function writeCart(next: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(next);
    cachedCartRaw = serialized;
    cachedCartParsed = next;
    window.localStorage.setItem(CART_STORAGE_KEY, serialized);
    emitStoreChange();
  } catch {
    // Ignore storage quota issues
  }
}

function writeWishlist(next: string[]) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(next);
    cachedWishlistRaw = serialized;
    cachedWishlistParsed = next;
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, serialized);
    emitStoreChange();
  } catch {
    // Ignore storage quota issues
  }
}

function writePromo(promo: PromoCode | null) {
  if (typeof window === "undefined") return;
  try {
    if (promo) {
      const serialized = JSON.stringify(promo);
      cachedPromoRaw = serialized;
      cachedPromoParsed = promo;
      window.localStorage.setItem(PROMO_STORAGE_KEY, serialized);
    } else {
      cachedPromoRaw = null;
      cachedPromoParsed = null;
      window.localStorage.removeItem(PROMO_STORAGE_KEY);
    }
    emitStoreChange();
  } catch {
    // Ignore storage quota issues
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(
    subscribeToStore,
    getCartSnapshot,
    getCartServerSnapshot
  );
  const wishlist = useSyncExternalStore(
    subscribeToStore,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );
  const appliedPromo = useSyncExternalStore(
    subscribeToStore,
    getPromoSnapshot,
    getPromoServerSnapshot
  );
  const isHydrated = useSyncExternalStore(
    subscribeToStore,
    getHydratedSnapshot,
    getHydratedServerSnapshot
  );

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(
    DEFAULT_STORE_CONFIG
  );
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchStoreConfig(),
      fetchPromos(),
      fetchCategories(),
    ]).then(([configRes, promosRes, categoriesRes]) => {
      if (!active) return;
      if (configRes.status === "fulfilled") {
        setStoreConfig(configRes.value);
      }
      if (promosRes.status === "fulfilled") {
        setAvailablePromos(promosRes.value);
      }
      if (categoriesRes.status === "fulfilled") {
        setCategories(categoriesRes.value);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addItem = useCallback(
    (
      product: Product,
      color: ProductColor,
      size: SizeOption,
      quantity = 1,
      openDrawer = true
    ) => {
      const current = getCartSnapshot();
      const key = `${product.id}__${color.name}__${size}`;
      const existing = current.find((item) => item.key === key);
      const rawImage = color.image || product.images[0]?.src || "";

      const next = existing
        ? current.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.min(item.quantity + quantity, 10) }
              : item
          )
        : [
            ...current,
            {
              key,
              productId: product.id,
              slug: product.slug,
              sku: product.sku,
              name: product.name,
              fabric: product.fabric,
              price: product.price,
              image: rawImage ? getS3ImageUrl(rawImage) : "",
              colorName: color.name,
              colorHex: color.hex,
              size,
              quantity: Math.max(1, Math.min(quantity, 10)),
            },
          ];

      writeCart(next);
      if (openDrawer) {
        setIsCartOpen(true);
      }
    },
    []
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    const current = getCartSnapshot();
    const next =
      quantity <= 0
        ? current.filter((item) => item.key !== key)
        : current.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.min(quantity, 10) }
              : item
          );
    writeCart(next);
  }, []);

  const removeItem = useCallback((key: string) => {
    const current = getCartSnapshot();
    writeCart(current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    writeCart(EMPTY_CART);
    writePromo(null);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const applyPromoCode = useCallback(
    async (rawCode: string): Promise<{ ok: boolean; message: string }> => {
      const cleaned = rawCode.trim().toUpperCase();
      if (!cleaned) {
        return { ok: false, message: "Enter a privilege code to apply." };
      }
      try {
        const res = await validatePromoCode(cleaned, subtotal);
        if (!res.ok || !res.promo) {
          return {
            ok: false,
            message: res.message || "Code not recognized.",
          };
        }
        writePromo(res.promo);
        return { ok: true, message: res.message };
      } catch {
        return {
          ok: false,
          message:
            "Unable to validate privilege code right now. Please try again.",
        };
      }
    },
    [subtotal]
  );

  const removePromoCode = useCallback(() => {
    writePromo(null);
  }, []);

  // Keep persisted promo synced with live Django backend rules
  useEffect(() => {
    if (!isHydrated || !appliedPromo || subtotal <= 0) return;
    let active = true;
    validatePromoCode(appliedPromo.code, subtotal)
      .then((res) => {
        if (!active) return;
        if (!res.ok || !res.promo) {
          writePromo(null);
        } else if (
          res.promo.value !== appliedPromo.value ||
          res.promo.type !== appliedPromo.type ||
          res.promo.description !== appliedPromo.description ||
          res.promo.minOrderAmount !== appliedPromo.minOrderAmount
        ) {
          writePromo(res.promo);
        }
      })
      .catch(() => {
        // Ignore transient network failures during background sync
      });
    return () => {
      active = false;
    };
  }, [isHydrated, appliedPromo, subtotal]);

  const toggleWishlist = useCallback((productId: string) => {
    const current = getWishlistSnapshot();
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    writeWishlist(next);
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const discountAmount = useMemo(() => {
    if (!appliedPromo || subtotal <= 0) return 0;
    if (
      appliedPromo.minOrderAmount &&
      subtotal < appliedPromo.minOrderAmount
    ) {
      return 0;
    }
    if (appliedPromo.type === "percent") {
      return Math.round((subtotal * appliedPromo.value) / 100);
    }
    return Math.min(appliedPromo.value, subtotal);
  }, [appliedPromo, subtotal]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      wishlist,
      appliedPromo,
      availablePromos,
      storeConfig,
      categories,
      itemCount,
      subtotal,
      discountAmount,
      isCartOpen,
      isHydrated,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyPromoCode,
      removePromoCode,
      toggleWishlist,
      isWishlisted,
    }),
    [
      items,
      wishlist,
      appliedPromo,
      availablePromos,
      storeConfig,
      categories,
      itemCount,
      subtotal,
      discountAmount,
      isCartOpen,
      isHydrated,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyPromoCode,
      removePromoCode,
      toggleWishlist,
      isWishlisted,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
