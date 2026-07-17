"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(undefined);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("tastybites_cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart items from localStorage", e);
      }
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem("tastybites_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.cartKey === product.cartKey);
      if (existingItem) {
        return prevItems.map((item) =>
          item.cartKey === product.cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { ...product, quantity }];
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

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
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
