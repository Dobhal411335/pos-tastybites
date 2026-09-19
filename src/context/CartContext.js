"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

const CartContext = createContext(undefined);

const CART_KEY = "tastybites_cart_v2";

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        setCartItems(JSON.parse(saved));
      } else {
        // migrate legacy key once
        const legacy = localStorage.getItem("tastybites_cart");
        if (legacy) {
          setCartItems(JSON.parse(legacy));
          localStorage.removeItem("tastybites_cart");
        }
      }
    } catch (e) {
      console.error("Failed to parse cart items from localStorage", e);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems, hydrated]);

  const addToCart = (product, quantity = 1) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.cartKey === product.cartKey);
      if (existingItem) {
        return prevItems.map((item) =>
          item.cartKey === product.cartKey
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prevItems, { ...product, quantity: qty }];
    });
  };

  const removeFromCart = (cartKey) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartKey);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.cartKey === cartKey ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cartItems]
  );

  const displaySubtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 0),
        0
      ),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        displaySubtotal,
        hydrated,
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
