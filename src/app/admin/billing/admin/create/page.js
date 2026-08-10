"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, List, LogIn, ShoppingCart, Tag, UtensilsCrossed, Receipt, Plus, CheckCircle, Search, ChevronDown, ChevronUp, User, Store, Hash, Package, Clock, Flame, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { Loader2 } from "lucide-react";
import { countryCodes } from "@/utils/countryCodes";
import Image from "next/image";

/** Client-safe draft ID for the UI only — final number is still sent with the order payload. */
function generateAdminOrderNumber() {
  const stamp = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 90 + 10);
  return `A-${stamp}${rand}`;
}

export default function AdminCreateOrderPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  const [cart, setCart] = useState([]);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuCategory, setMenuCategory] = useState("all");
  const [specialNote, setSpecialNote] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);



  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isClearOrderModalOpen, setIsClearOrderModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState("");

  // New POS specific state
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [orderType, setOrderType] = useState("Dine In"); // Dine In, Takeaway, Delivery
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [callNumber, setCallNumber] = useState("");
  const [tables, setTables] = useState([]);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes, tablesRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/products"),
        fetch("/api/floor/tables")
      ]);

      const [catJson, prodJson, tablesJson] = await Promise.all([
        catRes.json(),
        prodRes.json(),
        tablesRes.json()
      ]);

      if (catJson.success) setCategories(catJson.data);
      if (prodJson.success) setMenuItems(prodJson.data);
      if (tablesJson.success) setTables(tablesJson.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTax = (item, basePrice) => {
    if (!item.taxes || !Array.isArray(item.taxes) || item.taxes.length === 0) return 0;
    const pctTaxes = item.taxes.filter(t => t?.type?.toLowerCase().includes('percent')).reduce((sum, t) => sum + (t.value || 0), 0);
    const fixedTaxes = item.taxes.filter(t => t?.type && !t.type.toLowerCase().includes('percent')).reduce((sum, t) => sum + (t.value || 0), 0);
    return (basePrice * pctTaxes / 100) + fixedTaxes;
  };

  React.useEffect(() => {
    fetchInitialData();
    setGeneratedOrderId(generateAdminOrderNumber());
  }, []);

  const handleOpenOptions = (item) => {
    setSelectedItem(item);
    setSelectedSize(item.variants && item.variants.length > 0 ? item.variants[0].size : "Standard");
    setSelectedAddons([]);
    setIsOptionModalOpen(true);
  };

  const handleAddToCart = (item) => {
    const hasOptions = (item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0);

    if (hasOptions) {
      handleOpenOptions(item);
    } else {
      const price = item.variants && item.variants.length > 0 ? item.variants[0].price : 0;
      const discountAmount = calculateItemDiscount(item, price);
      const discountedPrice = Math.max(0, price - discountAmount);
      const itemTax = calculateItemTax(item, discountedPrice);

      setCart([...cart, {
        id: item._id,
        name: item.name,
        price: discountedPrice,
        tax: itemTax,
        basePriceTotal: price,
        itemDiscountTotal: discountAmount,
        hasItemDiscount: discountAmount > 0,
        cartId: Date.now(),
        qty: 1,
        size: "Standard",
        options: []
      }]);
      toast.success(`${item.name} added to cart.`);
    }
  };

  const toggleAddon = (addon) => {
    const isSelected = selectedAddons.find(a => a._id === addon._id);
    if (isSelected) {
      setSelectedAddons(selectedAddons.filter(a => a._id !== addon._id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const calculateItemDiscount = (item, basePrice) => {
    if (item.discount && item.discount.status === 'Active' && item.discountActive !== false) {
      if (item.discount.discountType === 'percent') {
        return basePrice * (item.discount.value / 100);
      } else {
        return item.discount.value;
      }
    }
    return 0;
  };

  const addOptionToCart = () => {
    if (!selectedItem) return;
    let basePrice = selectedItem.variants && selectedItem.variants.length > 0 ? selectedItem.variants[0].price : 0;

    if (selectedSize && selectedItem.variants && selectedItem.variants.length > 0) {
      const variant = selectedItem.variants.find(v => v.size === selectedSize);
      if (variant) basePrice = variant.price;
    }

    const discountAmount = calculateItemDiscount(selectedItem, basePrice);
    const discountedBasePrice = Math.max(0, basePrice - discountAmount);

    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const addonsDiscountAmount = selectedAddons.reduce((sum, a) => sum + calculateItemDiscount(selectedItem, a.price), 0);
    const discountedAddonsPrice = Math.max(0, addonsPrice - addonsDiscountAmount);

    const totalItemDiscount = discountAmount + addonsDiscountAmount;
    const finalSubtotal = discountedBasePrice + discountedAddonsPrice;
    const finalTax = calculateItemTax(selectedItem, finalSubtotal);
    const optionNames = selectedAddons.map(a => a.name);

    setCart([...cart, {
      id: selectedItem._id,
      name: selectedItem.name,
      price: finalSubtotal,
      tax: finalTax,
      basePriceTotal: basePrice + addonsPrice,
      itemDiscountTotal: totalItemDiscount,
      hasItemDiscount: totalItemDiscount > 0,
      cartId: Date.now(),
      qty: 1,
      size: selectedSize || "Standard",
      options: optionNames
    }]);

    setIsOptionModalOpen(false);
    toast.success(`${selectedItem.name} added to cart.`);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(c => c.cartId !== cartId));
  };

  const handleUpdateQty = (cartId, delta) => {
    setCart(cart.map(c => {
      if (c.cartId === cartId) {
        const newQty = c.qty + delta;
        return { ...c, qty: newQty };
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const applyCoupon = async () => {
    if (!couponCode) {
      toast.error("Enter a coupon code");
      return;
    }
    if (cart.some(c => c.hasItemDiscount)) {
      toast.error("Order discount cannot be applied because the cart contains items that are already discounted.");
      return;
    }
    try {
      const res = await fetch("/api/orders/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode })
      });
      const json = await res.json();
      if (json.success) {
        setAppliedDiscount(json.data);
        toast.success("Coupon applied!");
      } else {
        toast.error(json.message);
        setAppliedDiscount(null);
      }
    } catch (error) {
      toast.error("Failed to apply coupon");
    }
  };

  const removeCoupon = () => {
    setAppliedDiscount(null);
    setCouponCode("");
  };


  const handlePlaceOrderClick = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        orderNumber: generatedOrderId,
        items: cart,
        subTotal: grossSubtotal,
        taxTotal: totalTax,
        discountTotal: orderDiscountTotal + totalItemDiscounts,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        totalAmount: grandTotal,
        specialNote,
        guestName: customerName,
        callNumber: callNumber.trim() ? `${countryCode} ${callNumber.trim()}` : "",
        tableNo: tableNumber
      };

      const res = await fetch("/api/orders/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Admin Order placed successfully!");
        setIsConfirmModalOpen(false);
        setCart([]);
        setSpecialNote("");
        setAppliedDiscount(null);
        setCouponCode("");
        setCustomerName("");
        setCallNumber("");
        setTableNumber("");
        setGeneratedOrderId(generateAdminOrderNumber());
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const grossSubtotal = cart.reduce((acc, item) => acc + ((item.basePriceTotal || item.price) * item.qty), 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + ((item.itemDiscountTotal || 0) * item.qty), 0);
  const totalTax = cart.reduce((acc, item) => acc + ((item.tax || 0) * item.qty), 0);
  const netSubtotal = grossSubtotal - totalItemDiscounts;

  let orderDiscountTotal = 0;
  if (appliedDiscount) {
    if (appliedDiscount.discountType === 'percent') {
      orderDiscountTotal = netSubtotal * (appliedDiscount.value / 100);
    } else {
      orderDiscountTotal = appliedDiscount.value;
    }
  }

  const grandTotal = Math.max(0, netSubtotal + totalTax - orderDiscountTotal);
  const cartItemCount = cart.reduce((acc, item) => acc + (item.qty || 1), 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-zinc-50 font-sans" style={{ backgroundColor: PALETTE.canvas }}>
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Categories (20%) */}
        <div className="w-24 md:w-32 lg:w-48 xl:w-56 shrink-0 border-r border-zinc-200 bg-white flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-zinc-100 sticky top-0 bg-white z-10 flex items-center gap-2">
            <List className="w-5 h-5 text-zinc-400" />
            <h2 className="font-bold text-zinc-900 text-[13px] uppercase tracking-wider hidden md:block">Categories</h2>
          </div>
          <div className="flex-1 p-3 space-y-1">
            <button
              onClick={() => { setMenuCategory("all"); setVisibleCount(15); }}
              className={`w-full flex items-center gap-3 px-2 py-3 rounded-lg font-bold transition-all ${menuCategory === "all" ? "bg-orange-50 text-orange-600 border-l-4 border-orange-500 shadow-sm" : "text-zinc-600 hover:bg-zinc-200 border-l-4 border-transparent"}`}
            >
              <Store className={`w-5 h-5 ${menuCategory === "all" ? "text-orange-500" : "text-zinc-400"}`} />
              <span className="hidden md:block">All Items</span>
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => { setMenuCategory(c._id); setVisibleCount(15); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-bold transition-all ${menuCategory === c._id ? "bg-orange-50 text-orange-600 border-l-4 border-orange-500 shadow-sm" : "text-zinc-600 hover:bg-zinc-200 border-l-4 border-transparent"}`}
              >
                <Package className={`w-5 h-5 ${menuCategory === c._id ? "text-orange-500" : "text-zinc-400"}`} />
                <span className="hidden md:block text-left truncate text-sm text-wrap">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MIDDLE COLUMN: Product Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
          <div className="p-2 border-b border-zinc-200 bg-white shrink-0 flex items-center justify-between gap-4 z-10">
            <div className="flex-1 max-w-md relative">
              <Search className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search products..."
                className="w-full pl-10 pr-10 h-11 text-[14px] bg-zinc-50 border-zinc-200 focus:ring-orange-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(15); }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-500"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-zinc-50/50 flex flex-col"
            onScroll={(e) => {
              const bottom = e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 50;
              if (bottom && !isLoadingMore) {
                // Determine if we actually have more to load
                const filteredItems = menuItems.filter(item => (menuCategory === "all" || item.category?._id === menuCategory) && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (visibleCount < filteredItems.length) {
                  setIsLoadingMore(true);
                  setTimeout(() => {
                    setVisibleCount(prev => prev + 15);
                    setIsLoadingMore(false);
                  }, 400); // Small artificial delay to show skeletons smoothly
                }
              }
            }}
          >
            {loading ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : (() => {
              const filteredItems = menuItems.filter(item => (menuCategory === "all" || item.category?._id === menuCategory) && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
              const paginatedItems = filteredItems.slice(0, visibleCount);

              return (
                <div className="flex flex-col gap-3 flex-1 pb-10">
                  {filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 py-12 bg-white rounded-xl border border-zinc-200">
                      <Package className="w-16 h-16 opacity-20" />
                      <p className="font-bold text-lg text-zinc-500">No products found</p>
                      <p className="text-sm">Try searching or selecting another category.</p>
                    </div>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const itemPrice = item.variants && item.variants.length > 0 ? item.variants[0].price : (item.price || 0);
                      const hasOptions = (item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0);
                      const taxAmount = calculateItemTax(item, itemPrice);

                      return (
                        <div
                          key={item._id}
                          className="flex flex-col sm:flex-row items-stretch bg-white rounded border border-zinc-200 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-zinc-300 min-h-10"
                        >
                          {/* Food Item Info */}
                          <div className="flex-1 flex flex-col justify-center px-4 py-1 border-b sm:border-b-0 sm:border-r border-zinc-200">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-zinc-900 text-[15px]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[13px] font-semibold text-zinc-500">{item.category?.name || "Uncategorized"}</span>
                              {hasOptions && (
                                <span className="text-[11px] font-bold text-orange-500 flex items-center gap-1 uppercase tracking-wider">
                                  Variants
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price & Tax */}
                          <div className="flex items-center">
                            <div className="w-24 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Price</span>
                              <span className="text-[15px] font-black text-zinc-900">${itemPrice.toFixed(2)}</span>
                            </div>

                            <div className="w-24 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tax</span>
                              <span className="text-[14px] font-bold text-zinc-600">${taxAmount.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Add To Cart Button */}
                          <div className="w-full sm:w-40 shrink-0 p-3 bg-zinc-50/50 flex items-center justify-center">
                            <Button
                              className="w-full h-full min-h-5 bg-red-500 hover:bg-red-600 text-white font-bold text-[14px] rounded shadow-sm transition-colors"
                              onClick={() => hasOptions ? handleOpenOptions(item) : handleAddToCart(item)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              ADD TO CART
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {isLoadingMore && (
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex flex-col sm:flex-row items-stretch bg-white rounded border border-zinc-200 shadow-sm overflow-hidden min-h-10 animate-pulse">
                          {/* Skeleton Food Item Info */}
                          <div className="flex-1 flex flex-col justify-center px-4 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200">
                            <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-zinc-100 rounded w-1/4"></div>
                          </div>

                          {/* Skeleton Price & Tax */}
                          <div className="flex items-center">
                            <div className="w-24 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                              <div className="h-3 bg-zinc-100 rounded w-10 mb-1"></div>
                              <div className="h-4 bg-zinc-200 rounded w-12"></div>
                            </div>
                            <div className="w-24 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                              <div className="h-3 bg-zinc-100 rounded w-10 mb-1"></div>
                              <div className="h-4 bg-zinc-200 rounded w-12"></div>
                            </div>
                          </div>

                          {/* Skeleton Add To Cart Button */}
                          <div className="w-full sm:w-40 shrink-0 p-3 bg-zinc-50/50 flex items-center justify-center">
                            <div className="w-full h-10 bg-zinc-200 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        < div className="w-[320px] lg:w-[25%] shrink-0 bg-white border-l border-zinc-200 flex flex-col h-full z-10" >
          {/* Cart Header */}
          <div className="p-4 border-b border-zinc-200 bg-white shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 pb-px">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-zinc-900" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <h2 className="text-[17px] font-black text-zinc-900">
                Current Order
                {cartItemCount > 0 && (
                  <span className="text-orange-500 ml-1">({cartItemCount})</span>
                )}
              </h2>
            </div>
            <button
              className="text-red-500 hover:text-red-600 text-[13px] font-bold"
              onClick={() => setIsClearOrderModalOpen(true)}
            >
              Clear All
            </button>
          </div>

          {/* Cart Items (Scrollable) */}
          <div className="flex-1 overflow-y-auto bg-zinc-50/50 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-zinc-100 flex flex-col">
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center flex-col text-zinc-400 p-6 text-center space-y-4">
                <Package className="w-16 h-16 opacity-20" />
                <p className="font-bold text-lg text-zinc-500">Cart is empty</p>
                <p className="text-sm">Select items from the menu to start building the order.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 p-2 space-y-2">
                {cart.map((c) => (
                  <div key={c.cartId} className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-2 relative">
                    <button onClick={() => removeFromCart(c.cartId)} className="absolute top-3 right-3 text-white p-1 rounded-md cursor-pointer bg-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div className="flex-1 pr-6">
                        <h4 className="font-bold text-[14px] text-zinc-900 leading-tight">{c.name}</h4>
                        <div className="text-[12px] text-zinc-500 font-medium mt-0.5">
                          ${c.price.toFixed(2)}
                          {c.size && c.size !== "Standard" ? ` • ${c.size}` : ''}
                        </div>
                        {c.options && c.options.length > 0 && (
                          <div className="text-[11px] text-orange-600 mt-1 italic leading-tight">
                            + {c.options.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-50">
                      <div className="flex items-center bg-zinc-100 rounded-lg border border-zinc-200">
                        <button className="w-10 h-8 flex items-center justify-center rounded-l-lg hover:bg-zinc-200 text-zinc-700 font-black text-lg transition-colors" onClick={() => handleUpdateQty(c.cartId, -1)}>-</button>
                        <span className="w-10 text-center font-bold text-[14px] text-zinc-900 bg-white h-8 flex items-center justify-center">{c.qty}</span>
                        <button className="w-10 h-8 flex items-center justify-center rounded-r-lg hover:bg-zinc-200 text-zinc-700 font-black text-lg transition-colors" onClick={() => handleUpdateQty(c.cartId, 1)}>+</button>
                      </div>
                      <span className="font-black text-[16px] text-zinc-900">${((c.price + c.tax) * c.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Fixed Area: Notes, Discounts, & Summary */}
          <div className="shrink-0 bg-white border-t border-zinc-200 flex flex-col">
            {/* Notes & Discounts */}
            <div className="shrink-0 bg-white">
              <div className="p-3 border-b border-zinc-100">
                <Input
                  placeholder="Add special instructions..."
                  className="text-[13px] h-10 bg-zinc-50 border-zinc-500 focus:ring-orange-500 rounded-xl"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                />
              </div>

              <div className="divide-y divide-zinc-100">
                {/* Collapsible Discount */}
                <div className="px-3">
                  <button
                    className="w-full flex items-center justify-between py-3 text-[13px] font-bold text-zinc-700 hover:text-orange-600 transition-colors"
                    onClick={() => setShowDiscountInput(!showDiscountInput)}
                  >
                    <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> Add Discount</span>
                    {showDiscountInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showDiscountInput && (
                    <div className="pb-3 flex gap-2">
                      <Input
                        placeholder="Discount Code"
                        className="text-[12px] h-10 bg-zinc-50 border-zinc-200 uppercase focus:ring-orange-500 rounded-lg flex-1"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={!!appliedDiscount}
                      />
                      <Button
                        onClick={appliedDiscount ? removeCoupon : applyCoupon}
                        variant={appliedDiscount ? "destructive" : "default"}
                        className={`h-10 px-4 font-bold rounded-lg ${appliedDiscount ? '' : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}
                      >
                        {appliedDiscount ? 'Remove' : 'Apply'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary & Checkout */}
            <div className="bg-zinc-50 p-4 space-y-2 border-t border-zinc-200">
              <div className="space-y-1.5 pb-3 border-b border-zinc-200/50">
                <div className="flex justify-between text-[14px] font-medium text-zinc-500">
                  <span>Subtotal</span>
                  <span className="text-zinc-900">${grossSubtotal.toFixed(2)}</span>
                </div>
                {(totalItemDiscounts > 0 || orderDiscountTotal > 0) && (
                  <div className="flex justify-between text-[14px] font-bold text-emerald-600">
                    <span>Discount</span>
                    <span>-${(totalItemDiscounts + orderDiscountTotal).toFixed(2)}</span>
                  </div>
                )}
                {/* Discount display */}
                <div className="flex justify-between text-[14px] font-medium text-zinc-500">
                  <span>Tax</span>
                  <span className="text-zinc-900">${totalTax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-1">
                <span className="text-[14px] font-bold text-zinc-500 uppercase tracking-wider">Total</span>
                <span className="text-[20px] font-black text-orange-600 leading-none">${grandTotal.toFixed(2)}</span>
              </div>

              <Button
                className="w-full mt-4 h-12 text-xl font-black tracking-wide bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-transform active:scale-[0.98]"
                onClick={handlePlaceOrderClick}
              >
                Place Order
              </Button>
            </div>
          </div>
        </div>


        {
          isOptionModalOpen && selectedItem && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden bg-white animate-in zoom-in-95 duration-200">
                <CardHeader className="bg-zinc-50 border-b border-zinc-100 px-6 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-[20px] font-bold text-zinc-900">{selectedItem.name}</CardTitle>
                    <CardDescription className="text-[13px]">Select variations and extras</CardDescription>
                  </div>
                  <button
                    onClick={() => setIsOptionModalOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors"
                  >
                    ×
                  </button>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="flex text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 border-b border-zinc-100 pb-2 px-3">
                    <div className="flex-1">Option</div>
                    <div className="w-16 text-center">Base</div>
                    <div className="w-20 text-center">Discount</div>
                    <div className="w-20 text-center">Tax</div>
                    <div className="w-24 text-right">Final Price</div>
                  </div>

                  {/* Radio Options */}
                  {selectedItem.variants && selectedItem.variants.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[13px] font-bold text-zinc-900 mb-2 block">Variants</span>
                      {selectedItem.variants.map((v, idx) => {
                        const discountAmount = calculateItemDiscount(selectedItem, v.price);
                        const discountedPrice = Math.max(0, v.price - discountAmount);
                        const taxAmount = calculateItemTax(selectedItem, discountedPrice);
                        const finalPrice = discountedPrice + taxAmount;

                        return (
                          <label key={idx} className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors group ${selectedSize === v.size ? 'border-[#F97316] bg-orange-50/30' : 'border-zinc-200 hover:border-[#F97316]'}`}>
                            <div className={`flex-1 flex items-center gap-3 text-[14px] font-bold ${selectedSize === v.size ? 'text-zinc-900' : 'text-zinc-700 group-hover:text-zinc-900'}`}>
                              <input
                                type="radio"
                                name="size"
                                checked={selectedSize === v.size}
                                onChange={() => setSelectedSize(v.size)}
                                className="w-4 h-4 accent-[#F97316]"
                              />
                              <span>{v.size}</span>
                            </div>
                            <div className="w-16 text-center font-bold text-[13px] text-zinc-900">
                              ${v.price.toFixed(2)}
                            </div>
                            <div className="w-20 text-center text-red-500 font-medium text-[13px]">
                              {discountAmount > 0 ? `-$${discountAmount.toFixed(2)}` : "-"}
                            </div>
                            <div className="w-20 text-center text-zinc-500 font-medium text-[13px]">
                              +${taxAmount.toFixed(2)}
                            </div>
                            <div className="w-24 text-right font-bold text-[14px] text-zinc-900">
                              ${finalPrice.toFixed(2)}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Extras */}
                  {selectedItem.addons && selectedItem.addons.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-zinc-100">
                      <span className="text-[13px] font-bold text-zinc-900 mb-3 block">Extras</span>
                      {selectedItem.addons.map((addon) => {
                        const isChecked = selectedAddons.some(a => a._id === addon._id);

                        const discountAmount = calculateItemDiscount(selectedItem, addon.price);
                        const discountedPrice = Math.max(0, addon.price - discountAmount);
                        const taxAmount = calculateItemTax(selectedItem, discountedPrice);
                        const finalPrice = discountedPrice + taxAmount;

                        return (
                          <label key={addon._id} className="flex items-center border border-zinc-200 p-3 rounded-lg cursor-pointer hover:border-[#F97316] transition-colors group mb-2">
                            <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-700 group-hover:text-zinc-900">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAddon(addon)}
                                className="w-4 h-4 accent-[#F97316] rounded"
                              />
                              <span>{addon.name}</span>
                            </div>
                            <div className="w-16 text-center font-bold text-[13px] text-zinc-900">
                              +${addon.price.toFixed(2)}
                            </div>
                            <div className="w-20 text-center text-red-500 font-medium text-[13px]">
                              {discountAmount > 0 ? `-$${discountAmount.toFixed(2)}` : "-"}
                            </div>
                            <div className="w-20 text-center text-zinc-500 font-medium text-[13px]">
                              +${taxAmount.toFixed(2)}
                            </div>
                            <div className="w-24 text-right font-bold text-[14px] text-zinc-900">
                              +${finalPrice.toFixed(2)}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-zinc-100 flex gap-3 bg-zinc-50/50">
                  <Button variant="outline" className="flex-1 h-11 border-zinc-300 font-bold text-zinc-700 hover:bg-white" onClick={() => setIsOptionModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1 h-11 bg-[#F97316] hover:bg-[#e06510] text-white font-bold" onClick={addOptionToCart}>
                    Add to Cart
                  </Button>
                </div>
              </Card>
            </div>
          )
        }
        {
          isConfirmModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md shadow-2xl border-none bg-white animate-in zoom-in-95 duration-200 p-2">
                <CardHeader className="text-center pb-2">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[#1e40af]" />
                  </div>
                  <CardTitle className="text-[22px] font-bold text-zinc-900">Confirm Order</CardTitle>
                  <CardDescription className="text-[14px]">You are about to place this order.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-6">

                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Order ID</span>
                      <span className="font-bold text-[15px] text-zinc-900">
                        {generatedOrderId || "Pending..."}
                      </span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Amount</span>
                      <span className="font-bold text-[18px] text-[#F97316]">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[13px] font-bold text-zinc-700">Guest Name</label>
                      <Input 
                        placeholder="e.g. John Doe"
                        className="h-10 text-[13px] bg-white border-zinc-500 focus:ring-orange-500" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-bold text-zinc-700">Call Number</label>
                      <div className="flex gap-2">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                          <SelectTrigger className="w-37.5 h-10 text-[13px] bg-white border-zinc-500 focus:ring-orange-500 font-bold">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent className="max-h-62.5">
                            {countryCodes.map(c => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code}<span className="text-black font-normal ml-1 truncate">({c.country})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input 
                          placeholder="e.g. 555-0123"
                          className="flex-1 h-10 text-[13px] bg-white border-zinc-500 focus:ring-orange-500 font-bold" 
                          value={callNumber}
                          onChange={(e) => setCallNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-zinc-500 flex-1"></div>
                      <span className="text-[12px] font-bold text-zinc-400">OR</span>
                      <div className="h-px bg-zinc-500 flex-1"></div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-bold text-zinc-700">Table No</label>
                      <Select value={tableNumber} onValueChange={setTableNumber}>
                        <SelectTrigger className="h-10 text-[13px] bg-white border-zinc-500">
                          <SelectValue placeholder="Select Table" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select Table</SelectItem>
                          {tables.map(table => (
                            <SelectItem key={table._id} value={table.tableNumber}>Table {table.tableNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 font-bold text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                      onClick={() => setIsConfirmModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-12 font-bold text-white shadow-sm transition-transform hover:scale-[1.02]"
                      style={{ backgroundColor: "#1e40af" }}
                      onClick={handleFinalConfirm}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Confirm Order"}
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </div>
          )
        }
        {
          isClearOrderModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-sm shadow-2xl border-none bg-white animate-in zoom-in-95 duration-200 p-2">
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-red-500" />
                  </div>
                  <CardTitle className="text-[20px] font-bold text-zinc-900">Clear Order?</CardTitle>
                  <CardDescription className="text-[14px]">Are you sure you want to remove all items from the current order?</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-4">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 font-bold text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                      onClick={() => setIsClearOrderModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-11 font-bold text-white shadow-sm transition-transform hover:scale-[1.02] bg-red-500 hover:bg-red-600"
                      onClick={() => {
                        setCart([]); 
                        setAppliedDiscount(null);
                        setIsClearOrderModalOpen(false);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>  
          )
        }
      </div>
    </div>
  )
}

