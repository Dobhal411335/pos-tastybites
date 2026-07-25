"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Search, Plus, Minus, Mic, NotebookPen,
  CheckCircle2, X, Tag, DollarSign, Percent, User, Phone, MapPin, Trash2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId;

  // Data states
  const [categories, setCategories] = useState(["All"]);
  const [menuItems, setMenuItems] = useState([]);
  const [globalTaxes, setGlobalTaxes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Existing states
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("Dine-in");
  const [orderStatus, setOrderStatus] = useState("Draft");

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("Standard");
  const [selectedAddons, setSelectedAddons] = useState([]);

  // New states
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestTable, setGuestTable] = useState(tableId !== "new" ? tableId : "");
  const [orderNote, setOrderNote] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes, taxRes] = await Promise.all([
          fetch("/api/menu/categories"),
          fetch("/api/menu/products"),
          fetch("/api/tax")
        ]);
        const catJson = await catRes.json();
        const prodJson = await prodRes.json();
        const taxJson = await taxRes.json();

        if (catJson.success) {
          const cats = catJson.data.map(c => c.name);
          setCategories(["All", ...cats]);
        }
        if (prodJson.success) {
          setMenuItems(prodJson.data);
        }
        if (taxJson.success) {
          setGlobalTaxes(taxJson.data.filter(t => t.status === "Active"));
        }
      } catch (err) {
        toast.error("Failed to load menu data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = menuItems.filter(p => {
    const matchesCat = activeCategory === "All" || (p.category && p.category.name === activeCategory);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const calculateItemTax = (item, basePrice) => {
    let taxesToUse = (item.taxes && Array.isArray(item.taxes) && item.taxes.length > 0) ? item.taxes : globalTaxes;
    if (!taxesToUse || taxesToUse.length === 0) return 0;

    const pctTaxes = taxesToUse.filter(t => t?.type?.toLowerCase().includes('percent')).reduce((sum, t) => sum + (t.value || 0), 0);
    const fixedTaxes = taxesToUse.filter(t => t?.type && !t.type.toLowerCase().includes('percent')).reduce((sum, t) => sum + (t.value || 0), 0);
    return (basePrice * pctTaxes / 100) + fixedTaxes;
  };

  const handleOpenOptions = (item) => {
    setSelectedProduct(item);
    setSelectedSize(item.variants && item.variants.length > 0 ? item.variants[0].size : "Standard");
    setSelectedAddons([]);
    setIsOptionsModalOpen(true);
  };

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.some(a => a._id === addon._id);
      if (exists) return prev.filter(a => a._id !== addon._id);
      return [...prev, addon];
    });
  };

  const addToCart = (product) => {
    const hasOptions = product.variants && product.variants.length > 0;
    if (hasOptions) {
      handleOpenOptions(product);
      return;
    }

    const price = product.price || 0;
    const itemTax = calculateItemTax(product, price);

    setCart(prev => {
      const existing = prev.find(item => item.id === product._id && !item.modifier);
      if (existing) {
        return prev.map(item => item.id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        id: product._id,
        name: product.name,
        price,
        tax: itemTax,
        qty: 1,
        size: "Standard",
        cartId: Date.now()
      }];
    });
  };

  const addModifiedItemToCart = () => {
    if (!selectedProduct) return;
    let basePrice = selectedProduct.price || 0;

    if (selectedSize && selectedProduct.variants && selectedProduct.variants.length > 0) {
      const variant = selectedProduct.variants.find(v => v.size === selectedSize);
      if (variant) basePrice = variant.price;
    }

    const addonsPrice = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    const finalPrice = basePrice + addonsPrice;

    const finalTax = calculateItemTax(selectedProduct, finalPrice);

    let modifierStr = selectedSize && selectedSize !== "Standard" ? `Size: ${selectedSize}` : "";
    if (selectedAddons.length > 0) {
      modifierStr += (modifierStr ? " | " : "") + `Extras: ${selectedAddons.map(a => a.name).join(", ")}`;
    }

    setCart(prev => [...prev, {
      id: selectedProduct._id,
      cartId: Date.now(),
      name: selectedProduct.name,
      price: finalPrice,
      tax: finalTax,
      qty: 1,
      size: selectedSize,
      modifier: modifierStr || undefined
    }]);
    setIsOptionsModalOpen(false);
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === id || item.cartId === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      }).filter(item => item.qty > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => (item.cartId || item.id) !== id));
  };

  const handleSendToKitchen = () => {
    if (cart.length === 0) return;
    setIsKitchenModalOpen(true);
  };

  const handleConfirmKitchen = async () => {
    if (!guestName && !guestTable) {
      toast.error("Please enter a guest name or table number.");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        items: cart,
        subTotal: subtotal,
        taxTotal: totalTax,
        discountTotal: discountAmount,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        totalAmount: total,
        specialNote: orderNote,
        tableNo: guestTable,
        guestName: guestName,
        orderType: orderType
      };

      const res = await fetch("/api/orders/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Order sent to kitchen!");
        setIsKitchenModalOpen(false);
        setCart([]);
        setAppliedDiscount(null);
        setDiscountCode("");
        setOrderNote("");
        setOrderStatus("Pending");
        router.push("/employee/dashboard");
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Enter a discount code.");
      return;
    }
    try {
      const res = await fetch("/api/orders/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode })
      });
      const json = await res.json();
      if (json.success) {
        setAppliedDiscount({ code: json.data.code, value: json.data.value, type: json.data.discountType === 'percent' ? '%' : '$' });
        toast.success("Discount applied!");
      } else {
        toast.error(json.message || "Invalid discount code");
        setAppliedDiscount(null);
      }
    } catch (err) {
      toast.error("Failed to apply discount");
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  const handlePayment = () => {
    toast.success("Payment collected!");
    setOrderStatus("Paid");
    setTimeout(() => router.push("/employee/dashboard"), 1500);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalTax = cart.reduce((sum, item) => sum + ((item.tax || 0) * item.qty), 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "%"
      ? (subtotal * appliedDiscount.value) / 100
      : Math.min(appliedDiscount.value, subtotal)
    : 0;
  const total = subtotal - discountAmount + totalTax;

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-128px)] -m-4 bg-zinc-50 font-sans overflow-hidden items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="mt-4 text-zinc-500 font-semibold">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] -m-4 bg-zinc-50 font-sans overflow-hidden">

      {/* TOP HEADER */}
      <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        {/* Back & Table Info */}
        <div className="flex items-center gap-3 w-60 shrink-0">
          <Button
            variant="ghost"
            onClick={() => router.push("/employee/dashboard")}
            className="h-8 px-3 hover:bg-orange-500 border rounded-lg shrink-0 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-700 shrink-0" />
            <span className="text-xs font-medium text-zinc-700 leading-tight text-left">
              Back
            </span>
          </Button>

          <div className="flex flex-col">
            <h1 className="text-base font-bold text-zinc-900 leading-tight">
              Table {tableId}
            </h1>
            <span className="text-xs font-semibold text-zinc-500">Main Floor</span>
          </div>
        </div>
      </header>

      {/* SPLIT PANELS */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* LEFT PANEL (MENU) — ~65% */}
        <div className="w-[65%] flex flex-col border-r border-zinc-200 bg-zinc-50">

          {/* Search & Category Tabs */}
          <div className="flex items-center gap-2 px-4 py-4 bg-white border-b border-zinc-200 shrink-0">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-10 h-11 bg-zinc-50 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-orange-500"
              />
            </div>
            <div className="w-80">
              <Select value={activeCategory} onValueChange={setActiveCategory}>
                <SelectTrigger className="w-full h-11 bg-white border-zinc-200 rounded-lg font-bold text-zinc-900 focus:ring-orange-500">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} className="font-semibold text-zinc-900">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clean List Rows (Professional UI) */}
          <ScrollArea className="flex-1 bg-zinc-50/50">
            <div className="flex flex-col p-4 gap-3">
              {filteredProducts.map((product) => {
                const hasOptions = product.variants && product.variants.length > 0;
                const isAvailable = product.inStock !== false;
                const basePrice = hasOptions ? product.variants[0].price : (product.price || 0);
                const taxAmount = calculateItemTax(product, basePrice);

                return (
                  <div
                    key={product._id}
                    className="flex flex-col sm:flex-row items-stretch bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-zinc-300 min-h-19"
                  >
                    {/* Food Item Info */}
                    <div className="flex-1 flex flex-col justify-center px-4 py-3 border-b sm:border-b-0 sm:border-r border-zinc-300">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-zinc-900 text-sm">{product.name}</span>
                        {!isAvailable && (
                          <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 shrink-0">Out of Stock</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-500">{product.category?.name || "Uncategorized"}</span>
                        {hasOptions && (
                          <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                            <NotebookPen className="w-3.5 h-3.5" />
                            Variants
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Tax */}
                    <div className="flex items-center">
                      <div className="w-25 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-300 h-full">
                        <span className="text-sm font-semibold text-zinc-500">Price</span>
                        <span className="text-sm font-black text-zinc-900">${basePrice.toFixed(2)}</span>
                      </div>

                      <div className="w-25 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-300 h-full">
                        <span className="text-sm font-semibold text-zinc-500">Tax</span>
                        <span className="text-sm font-bold text-zinc-900">${taxAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Add To Cart Button */}
                    <div className="w-full sm:w-35 shrink-0 p-3 bg-zinc-50/50 flex items-center justify-center">
                      <Button
                        className="w-full h-full min-h-8 bg-zinc-900 hover:bg-orange-500 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:bg-zinc-200 disabled:text-zinc-400"
                        disabled={!isAvailable}
                        onClick={() => hasOptions ? handleOpenOptions(product) : addToCart(product)}
                      >
                        {hasOptions ? "Select Options" : "Add to Cart"}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center bg-white rounded-xl border border-zinc-200 shadow-sm mx-4">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-base font-bold text-zinc-900">No items found</p>
                  <p className="text-sm font-medium text-zinc-500 mt-1">Try adjusting your search or category.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANEL (LIVE CART) — ~35% */}
        <div className="w-[35%] flex flex-col bg-white">
          {/* Scrollable area: cart items + notes + discount */}
          <ScrollArea className="flex-1 bg-zinc-50">
            <div className="p-4 space-y-4">
              {/* Cart items */}
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <p className="font-bold text-sm text-zinc-900">No items added</p>
                  <p className="text-xs font-semibold mt-1">Tap a menu item to begin order.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div key={item.cartId || idx} className="bg-white rounded-lg p-3 border border-zinc-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <h4 className="font-bold text-zinc-900 text-sm leading-tight">{item.name}</h4>
                          {item.modifier && <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">{item.modifier}</p>}
                        </div>
                        <span className="font-bold text-sm text-zinc-900 shrink-0">${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                            <button
                            onClick={() => removeFromCart(item.cartId || item.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-100 rounded-md p-0.5">
                          <button onClick={() => updateQty(item.cartId || item.id, -1)} className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-zinc-700 hover:bg-zinc-50">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-sm w-4 text-center text-zinc-900">{item.qty}</span>
                          <button onClick={() => updateQty(item.cartId || item.id, 1)} className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-zinc-700 hover:bg-zinc-50">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Notes & Discount */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="h-px bg-zinc-200" />

                  {/* Order-level Note */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Order Notes</label>
                    <textarea
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="e.g. Nut allergy, no garlic bread..."
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none shadow-sm"
                      rows={2}
                    />
                  </div>

                  {/* Discount / Coupon */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Discount / Coupon</label>
                    {appliedDiscount ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-bold text-green-800">{appliedDiscount.code}</span>
                          <span className="text-xs font-semibold text-green-600">
                            −{appliedDiscount.type === "%" ? `${appliedDiscount.value}%` : `$${appliedDiscount.value}`}
                          </span>
                        </div>
                        <button onClick={handleRemoveDiscount} className="text-zinc-400 hover:text-red-500 p-1 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="CODE (e.g. SUMMER10)"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          className="flex-1 h-10 bg-white border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-orange-500 shadow-sm"
                        />
                        <Button
                          onClick={handleApplyDiscount}
                          className="h-10 px-4 rounded-lg bg-zinc-900 text-white font-bold text-xs shadow-none hover:bg-zinc-800 shrink-0"
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Pinned Bottom Totals & Actions */}
          <div className="px-4 pt-3 pb-4 border-t border-zinc-200 bg-white shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>Subtotal</span>
                <span className="text-zinc-900">${subtotal.toFixed(2)}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-sm font-semibold text-green-600">
                  <span>Discount ({appliedDiscount.code})</span>
                  <span>−${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>Tax</span>
                <span className="text-zinc-900">${totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-100">
                <span className="text-base font-bold text-zinc-900">Total</span>
                <span className="text-2xl font-black text-zinc-900 leading-none">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0}
                className="h-13 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-none"
              >
                Send to Kitchen
              </Button>
              <Button
                onClick={handlePayment}
                disabled={orderStatus !== "Served"}
                className="h-13 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl shadow-none disabled:opacity-25 disabled:cursor-not-allowed"
              >
                Collect Payment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* SEND TO KITCHEN MODAL */}
      {isKitchenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Confirm Order</h2>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">Guest info or table number required.</p>
              </div>
              <button onClick={() => setIsKitchenModalOpen(false)} className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Guest Name
                </label>
                <Input
                  placeholder="e.g. John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="h-11 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-zinc-100" />
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Table Number
                </label>
                <Input
                  placeholder="e.g. T-01"
                  value={guestTable}
                  onChange={(e) => setGuestTable(e.target.value)}
                  className="h-11 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-orange-500"
                />
                {guestTable && (
                  <p className="text-[11px] text-zinc-500 font-semibold">Pre-filled from table selection.</p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsKitchenModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmKitchen}
                disabled={isSubmitting}
                className="flex-2 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Send"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM OPTIONS MODAL */}
      {isOptionsModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{selectedProduct.name}</h2>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">Select variations and extras</p>
              </div>
              <button onClick={() => setIsOptionsModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">

                <div className="flex text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2 px-1">
                  <div className="flex-1">Option</div>
                  <div className="w-24 text-center">Price</div>
                </div>

                {/* Variants */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[13px] font-bold text-zinc-900 mb-2 block">Size / Variant</span>
                    <div className="grid gap-2">
                      {selectedProduct.variants.map((v) => (
                        <label
                          key={v.size}
                          className={`flex items-center border rounded-lg p-3 cursor-pointer transition-colors group ${selectedSize === v.size ? 'border-orange-500 bg-orange-50/30' : 'border-zinc-200 hover:border-orange-300'
                            }`}
                          onClick={() => setSelectedSize(v.size)}
                        >
                          <div className={`flex-1 flex items-center gap-3 text-sm font-bold ${selectedSize === v.size ? 'text-zinc-900' : 'text-zinc-700 group-hover:text-zinc-900'}`}>
                            <input
                              type="radio"
                              name="size"
                              checked={selectedSize === v.size}
                              onChange={() => setSelectedSize(v.size)}
                              className="w-4 h-4 accent-orange-500"
                            />
                            <span>{v.size}</span>
                          </div>
                          <div className="w-24 text-center font-bold text-sm text-zinc-900">${v.price.toFixed(2)}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Addons / Extras */}
                {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[13px] font-bold text-zinc-900 mb-3 block">Extras</span>
                    <div className="grid gap-2">
                      {selectedProduct.addons.map((addon) => {
                        const isChecked = selectedAddons.some(a => a._id === addon._id);
                        return (
                          <label
                            key={addon._id}
                            className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors group ${isChecked ? 'border-orange-500 bg-orange-50/30' : 'border-zinc-200 hover:border-orange-300'
                              }`}
                          >
                            <div className={`flex-1 flex items-center gap-3 text-sm font-bold ${isChecked ? 'text-zinc-900' : 'text-zinc-700 group-hover:text-zinc-900'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAddon(addon)}
                                className="w-4 h-4 accent-orange-500 rounded"
                              />
                              <span>{addon.name}</span>
                            </div>
                            <div className="w-24 text-center font-bold text-sm text-zinc-900">+${addon.price.toFixed(2)}</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tax Breakdown */}
                {(() => {
                  const basePrice = selectedProduct.variants && selectedProduct.variants.length > 0
                    ? (selectedProduct.variants.find(v => v.size === selectedSize)?.price || 0)
                    : (selectedProduct.price || 0);
                  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
                  const totalPreTax = basePrice + addonsTotal;
                  const estimatedTax = calculateItemTax(selectedProduct, totalPreTax);

                  return (
                    <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-100 mt-4">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Item Breakdown</p>
                      <div className="flex justify-between text-xs font-semibold text-zinc-500">
                        <span>Total Options & Extras</span>
                        <span>${totalPreTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-500">
                        <span>Estimated Tax</span>
                        <span>${estimatedTax.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>

            <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 shrink-0 flex gap-3 rounded-b-2xl">
              <Button onClick={() => setIsOptionsModalOpen(false)} variant="outline" className="flex-1 h-11 border-zinc-300 font-bold text-zinc-700 hover:bg-white shadow-none">
                Cancel
              </Button>
              <Button onClick={addModifiedItemToCart} className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none">
                Confirm & Add
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
