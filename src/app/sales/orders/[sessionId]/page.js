"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import {
  ArrowLeft, Search, Plus, Minus, Mic, NotebookPen,
  CheckCircle2, X, Tag, DollarSign, Percent, User, Phone, MapPin, Trash2,
  Loader2, LayoutGrid, List, Coffee, Utensils, UtensilsCrossed, Wine, Beer, Cake, IceCream, Pizza, Sandwich, ShoppingCart
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
  const { socket } = useSocket();
  const sessionId = params.sessionId;

  // Data states
  const [categories, setCategories] = useState(["All"]);
  const [menuItems, setMenuItems] = useState([]);
  const [globalTaxes, setGlobalTaxes] = useState([]);
  const [sessionData, setSessionData] = useState(null);
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
  const [guestTable, setGuestTable] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Card"); // Card, Cash, GiftCard
  const [amountTendered, setAmountTendered] = useState("");
  const [tipAmount, setTipAmount] = useState(0);

  // Split payment / Gift card states
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [giftCardDetails, setGiftCardDetails] = useState(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState(null);
  const [giftCardError, setGiftCardError] = useState("");
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);
  const [giftCardSplitAmount, setGiftCardSplitAmount] = useState(0);

  // View States
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [heads, setHeads] = useState([{ _id: "all", name: "All" }]);
  const [productHeads, setProductHeads] = useState([]);
  const [activeHead, setActiveHead] = useState("All");
  const [isClearOrderModalOpen, setIsClearOrderModalOpen] = useState(false);

  const headIconMap = {
    'Breakfast': Coffee,
    'Brunch': Sandwich,
    'Lunch': Pizza,
    'Dinner': UtensilsCrossed,
    'Kids Menu': User,
    'Beverages': Coffee,
    'Desserts': Cake,
    'Bar & Cocktails': Wine,
    'Offer': Tag,
  };

  const getHeadIcon = (headName) => {
    if (headName === 'All') return <LayoutGrid className="w-8 h-8 mb-1" strokeWidth={1.5} />;
    const Icon = headIconMap[headName] || Utensils;
    return <Icon className="w-8 h-8 mb-1" strokeWidth={1.5} />;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes, taxRes, headRes, phRes] = await Promise.all([
          fetch("/api/menu/categories"),
          fetch("/api/menu/products"),
          fetch("/api/tax"),
          fetch("/api/menu/heads"),
          fetch("/api/menu/product-heads")
        ]);
        const catJson = await catRes.json();
        const prodJson = await prodRes.json();
        const taxJson = await taxRes.json();
        const headJson = await headRes.json();
        const phJson = await phRes.json();

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
        if (headJson.success) {
          setHeads([{ _id: "all", name: "All" }, ...headJson.data]);
        }
        if (phJson.success) {
          setProductHeads(phJson.data);
        }

        // Fetch session and existing order data if not "new"
        if (sessionId !== "new") {
          // Fetch floor data to extract session details
          const floorRes = await fetch("/api/sales/floor");
          const floorJson = await floorRes.json();
          if (floorJson.success) {
            const currentSession = floorJson.data.sessions.find(s => s.id === sessionId);
            if (currentSession) {
              setSessionData(currentSession);
              setGuestTable(currentSession.tableId);
            }
          }

          // Fetch existing order for this session
          const orderRes = await fetch(`/api/orders/employee?sessionId=${sessionId}`);
          const orderJson = await orderRes.json();
          if (orderJson.success && orderJson.data) {
            const existingOrder = orderJson.data;
            setActiveOrder(existingOrder);
            setOrderStatus(existingOrder.status);
            setOrderNote(existingOrder.specialNote || "");
            
            // Reconstruct cart
            const restoredCart = existingOrder.items.map(item => ({
              id: item.menuItemId,
              name: item.name,
              price: item.price,
              tax: item.tax,
              qty: item.qty,
              size: item.size,
              modifier: item.options.length > 0 ? `Extras: ${item.options.join(", ")}` : undefined,
              cartId: Date.now() + Math.random()
            }));
            setCart(restoredCart);

            if (existingOrder.discountCode) {
              // Note: We don't have the full discount object, but we have the code and amount
              setAppliedDiscount({ 
                code: existingOrder.discountCode, 
                value: existingOrder.discountTotal, 
                type: "$" 
              });
            }
          }
        }
      } catch (err) {
        toast.error("Failed to load order data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  const fetchOrderOnly = useCallback(async () => {
    if (sessionId === "new") return;
    try {
      const orderRes = await fetch(`/api/orders/employee?sessionId=${sessionId}`);
      const orderJson = await orderRes.json();
      if (orderJson.success && orderJson.data) {
        const existingOrder = orderJson.data;
        setActiveOrder(existingOrder);
        setOrderStatus(existingOrder.status);
      }
    } catch (err) {
      console.error(err);
    }
  }, [sessionId]);

  useEffect(() => {
    const handleReconnect = () => {
      fetchOrderOnly();
    };

    window.addEventListener('socket:reconnect', handleReconnect);
    
    if (socket) {
      socket.on('order:updated', fetchOrderOnly);
      socket.on('payment:completed', fetchOrderOnly);
    }
    
    return () => {
      window.removeEventListener('socket:reconnect', handleReconnect);
      if (socket) {
        socket.off('order:updated', fetchOrderOnly);
        socket.off('payment:completed', fetchOrderOnly);
      }
    };
  }, [socket, fetchOrderOnly]);

  const filteredProducts = menuItems.filter(p => {
    let matchesHead = true;
    if (viewMode === "grid" && activeHead !== "All") {
      const ph = productHeads.find(h => h.head?.name === activeHead);
      if (ph) {
        matchesHead = ph.categories.some(c => c.products.includes(p._id));
      } else {
        matchesHead = false;
      }
    }
    const matchesCat = viewMode === "list" ? (activeCategory === "All" || (p.category && p.category.name === activeCategory)) : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHead && matchesCat && matchesSearch;
  });

  const calculateItemTax = (item, basePrice) => {
    let taxesToUse = (item.taxes && Array.isArray(item.taxes) && item.taxes.length > 0) ? item.taxes : globalTaxes;
    if (!taxesToUse || taxesToUse.length === 0) return 0;

    const pctTaxes = taxesToUse.filter(t => t?.type?.toLowerCase().includes('percent')).reduce((sum, t) => sum + (t.value || 0), 0);
    const fixedTaxes = taxesToUse.filter(t => t?.type && !t.type.toLowerCase().includes('percent')).reduce((sum, t) => sum + (t.value || 0), 0);
    return (basePrice * pctTaxes / 100) + fixedTaxes;
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
    
    // If it's an existing session, we can skip the kitchen modal and just send it
    if (sessionId !== "new") {
      handleConfirmKitchen();
    } else {
      setIsKitchenModalOpen(true);
    }
  };

  const handleConfirmKitchen = async () => {
    if (sessionId === "new" && !guestName && !guestTable) {
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
        sessionId: sessionId !== "new" ? sessionId : null,
        tableNo: sessionId === "new" ? guestTable : undefined,
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
        setActiveOrder(json.data);
        setOrderStatus("PENDING");
        // Don't clear cart, keep them on the screen or redirect back to floor
        setTimeout(() => {
          router.push("/sales/floor");
        }, 1000);
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

  const verifyGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    setIsVerifyingGiftCard(true);
    setGiftCardError("");
    setGiftCardBalance(null);
    setGiftCardDetails(null);
    try {
      const res = await fetch(`/api/menu/giftcards?code=${giftCardCode}`);
      const json = await res.json();
      if (json.success) {
        setGiftCardDetails(json.data);
        setIsGiftCardModalOpen(true);
      } else {
        setGiftCardError(json.message || "Invalid Gift Card");
      }
    } catch (err) {
      setGiftCardError("Failed to verify Gift Card");
    } finally {
      setIsVerifyingGiftCard(false);
    }
  };

  const handleApplyGiftCard = () => {
    const actualBalance = giftCardDetails.balance ?? giftCardDetails.value;
    setGiftCardBalance(actualBalance);
    if (actualBalance < total) {
       setGiftCardSplitAmount(total - actualBalance);
    } else {
       setGiftCardSplitAmount(0);
       setAmountTendered("");
    }
    setIsGiftCardModalOpen(false);
  };

  const handlePayment = async () => {
    if (cart.length === 0) return;
    try {
      setIsSubmitting(true);
      let currentOrder = activeOrder;
      
      if (!currentOrder) {
        // Create order first
        const payload = {
          items: cart,
          subTotal: subtotal,
          taxTotal: totalTax,
          discountTotal: discountAmount,
          discountCode: appliedDiscount ? appliedDiscount.code : null,
          totalAmount: total,
          specialNote: orderNote,
          sessionId: sessionId !== "new" ? sessionId : null,
          tableNo: sessionId === "new" ? guestTable : undefined,
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
          currentOrder = json.data;
          setActiveOrder(json.data);
        } else {
          toast.error(json.message || "Failed to create order before payment.");
          setIsSubmitting(false);
          return;
        }
      }

      // Proceed with Payment
      const paymentPayload = {
        orderId: currentOrder._id,
        amount: total,
        method: paymentMethod,
        sessionId: sessionId !== "new" ? sessionId : undefined,
        tipAmount: paymentMethod === 'Cash' ? tipAmount : 0,
      };

      if (giftCardBalance !== null) {
        paymentPayload.giftCardCode = giftCardCode;
        paymentPayload.splitAmount = giftCardSplitAmount;
      }

      const res = await fetch("/api/sales/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload)
      });
      const json = await res.json();
      if (json.success) {
        if (giftCardBalance !== null && giftCardCode) {
           const amountToUse = total - giftCardSplitAmount;
           await fetch("/api/menu/giftcards/redeem", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               code: giftCardCode,
               amountToUse: amountToUse,
               orderId: currentOrder.orderNumber || currentOrder._id,
               note: "POS Payment"
             })
           });
        }
        
        toast.success("Payment collected successfully!");
        setOrderStatus("PAID");
        setIsPaymentModalOpen(false);
        setTimeout(() => router.push("/sales/floor"), 1000);
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("Failed to process payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearOrder = () => {
    setCart([]);
    setOrderNote("");
    setAppliedDiscount(null);
    setIsClearOrderModalOpen(false);
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
      <div className="flex flex-col h-screen w-full items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-4 text-zinc-500 font-semibold">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] w-full bg-zinc-50 font-sans overflow-hidden border border-zinc-200 rounded-xl shadow-sm">

      {/* SPLIT PANELS */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANEL (MENU) */}
        <div className="w-[65%] flex flex-col border-r border-zinc-200 bg-zinc-50">
          {/* LEFT PANEL HEADER */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200 shrink-0">
            <h2 className="text-[17px] font-black text-zinc-900">Create Order</h2>
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Heads Grid (GRID VIEW) */}
          {viewMode === "grid" && (
            <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-zinc-200 shrink-0 overflow-x-auto custom-scrollbar">
              {heads.map(head => (
                <button
                  key={head._id}
                  onClick={() => setActiveHead(head.name)}
                  className={`flex flex-col items-center justify-center min-w-[96px] h-[84px] rounded-xl transition-all border ${
                    activeHead === head.name 
                      ? "bg-orange-500 text-white border-orange-500 shadow-md" 
                      : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  {getHeadIcon(head.name)}
                  <span className="text-[11px] font-black uppercase tracking-wider">{head.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search & Category Tabs (LIST VIEW) */}
          {viewMode === "list" && (
            <div className="flex items-center gap-2 px-4 py-4 bg-white border-b border-zinc-200 shrink-0">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-10 h-11 bg-zinc-50 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
              />
            </div>
            <div className="w-80">
              <Select value={activeCategory} onValueChange={setActiveCategory}>
                <SelectTrigger className="w-full h-11 bg-white border-zinc-200 rounded-lg font-bold text-zinc-900 focus:ring-blue-500">
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
          )}

          <div className="flex-1 bg-zinc-50/50 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col p-4 gap-3">
              {filteredProducts.map((product) => {
                const hasOptions = product.variants && product.variants.length > 0;
                const isAvailable = product.inStock !== false;
                const basePrice = hasOptions ? product.variants[0].price : (product.price || 0);
                const taxAmount = calculateItemTax(product, basePrice);

                return (
                  <div
                    key={product._id}
                    className="flex flex-col sm:flex-row items-stretch bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden transition-all hover:shadow-md min-h-[76px]"
                  >
                    {/* Food Item Info */}
                    <div className="flex-1 flex flex-col justify-center px-4 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-zinc-900 text-xs md:text-sm">{product.name}</span>
                        {!isAvailable && (
                          <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 shrink-0">Out of Stock</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-500">{product.category?.name || "Uncategorized"}</span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-20 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Price</span>
                        <span className="text-sm font-black text-zinc-900">${basePrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Add To Cart Button */}
                    <div className="w-full sm:w-32 shrink-0 p-2 flex items-center justify-center">
                      <Button
                        className="w-full h-full min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:bg-zinc-200 disabled:text-zinc-400"
                        disabled={!isAvailable}
                        onClick={() => hasOptions ? handleOpenOptions(product) : addToCart(product)}
                      >
                        {hasOptions ? "Options" : "Add"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (LIVE CART) */}
        <div className="w-[35%] flex flex-col bg-white">
          <div className="p-4 border-b border-zinc-200 bg-white shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 pb-px">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-zinc-900" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
                    {cart.reduce((sum, item) => sum + item.qty, 0)}
                  </span>
                )}
              </div>
              <h2 className="text-[17px] font-black text-zinc-900">
                Order {activeOrder?.orderNumber ? `#${activeOrder.orderNumber}` : ""}
              </h2>
            </div>
            <button
              className="text-red-500 hover:text-red-600 text-[13px] font-bold disabled:opacity-50"
              onClick={() => setIsClearOrderModalOpen(true)}
              disabled={cart.length === 0}
            >
              Clear All
            </button>
          </div>
          <div className="flex-1 bg-zinc-50 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-4">
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

              {cart.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="h-px bg-zinc-200" />
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Order Notes</label>
                    <textarea
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="e.g. Nut allergy..."
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none shadow-sm"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pt-3 pb-4 border-t border-zinc-200 bg-white shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>Subtotal</span>
                <span className="text-zinc-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>Tax</span>
                <span className="text-zinc-900">${totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-100">
                <span className="text-base font-bold text-zinc-900">Total</span>
                <span className="text-2xl font-black text-zinc-900 leading-none">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0 || isSubmitting}
                className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-none"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kitchen / KOT"}
              </Button>
              <Button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={cart.length === 0 || orderStatus === "PAID"}
                className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-none"
              >
                {orderStatus === "PAID" ? "Paid" : "Pay Now"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* KITCHEN MODAL ONLY FOR WALK-INS (sessionId === "new") */}
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
                  className="h-11 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
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
                  className="h-11 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
                />
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
                className="flex-2 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Send"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-zinc-900">Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              <div className="flex flex-col items-center justify-center py-5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Due</span>
                <span className="text-4xl font-black text-zinc-900 leading-none">${total.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg">
                {['Card', 'Cash', 'GiftCard'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${
                      paymentMethod === method 
                        ? 'bg-white text-zinc-900 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {method === 'GiftCard' ? 'Gift Card' : method}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Cash' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Apply Gift Card (Optional)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          value={giftCardCode}
                          onChange={(e) => setGiftCardCode(e.target.value)}
                          placeholder="Enter code..."
                          className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                        />
                      </div>
                      <Button onClick={verifyGiftCard} disabled={!giftCardCode || isVerifyingGiftCard} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 rounded-lg shadow-none">
                        {isVerifyingGiftCard ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                    {giftCardError && <p className="text-xs font-bold text-red-500 mt-1">{giftCardError}</p>}
                  </div>

                  {giftCardBalance !== null && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-green-900">Applied Gift Card Balance</span>
                        <span className="font-black text-green-700">${giftCardBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                        <span className="font-bold text-orange-600">Remaining Balance Due (Cash)</span>
                        <span className="font-black text-orange-600">${giftCardSplitAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {(giftCardBalance === null || giftCardSplitAmount > 0) && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Amount Tendered</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                          type="number"
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}
                  
                  {parseFloat(amountTendered) > (giftCardBalance !== null ? giftCardSplitAmount : total) && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-orange-900">Change Due</span>
                        <span className="text-xl font-black text-orange-600">${(parseFloat(amountTendered) - (giftCardBalance !== null ? giftCardSplitAmount : total)).toFixed(2)}</span>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${tipAmount > 0 ? 'bg-orange-500 border-orange-500' : 'bg-white border-zinc-300 group-hover:border-orange-400'}`}>
                          {tipAmount > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={tipAmount > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTipAmount(Math.round((parseFloat(amountTendered) - (giftCardBalance !== null ? giftCardSplitAmount : total)) * 100) / 100);
                            } else {
                              setTipAmount(0);
                            }
                          }}
                        />
                        <span className="text-sm font-bold text-orange-900">Keep as Tip</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">Process Card Payment</h3>
                  <p className="text-sm font-medium text-zinc-500">Tap or insert card on the terminal</p>
                </div>
              )}

              {paymentMethod === 'GiftCard' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Gift Card Code</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          value={giftCardCode}
                          onChange={(e) => setGiftCardCode(e.target.value)}
                          placeholder="Enter code..."
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                        />
                      </div>
                      <Button onClick={verifyGiftCard} disabled={!giftCardCode || isVerifyingGiftCard} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 rounded-lg shadow-none">
                        {isVerifyingGiftCard ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                    {giftCardError && <p className="text-xs font-bold text-red-500 mt-1">{giftCardError}</p>}
                  </div>

                  {giftCardBalance !== null && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-green-900">Available Balance</span>
                        <span className="font-black text-green-700">${giftCardBalance.toFixed(2)}</span>
                      </div>
                      {giftCardSplitAmount > 0 ? (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                          <span className="font-bold text-orange-600">Remaining Balance Due</span>
                          <span className="font-black text-orange-600">${giftCardSplitAmount.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                          <span className="font-bold text-green-900">Remaining Balance After</span>
                          <span className="font-bold text-green-700">${(giftCardBalance - total).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={
                  isSubmitting || 
                  (paymentMethod === 'Cash' && giftCardSplitAmount > 0 && (!amountTendered || parseFloat(amountTendered) < giftCardSplitAmount)) ||
                  (paymentMethod === 'Cash' && giftCardBalance === null && (!amountTendered || parseFloat(amountTendered) < total)) ||
                  (paymentMethod === 'GiftCard' && (giftCardBalance === null))
                }
                className="flex-2 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GIFTCARD VERIFICATION MODAL */}
      {isGiftCardModalOpen && giftCardDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">Giftcard History</h2>
              <button onClick={() => setIsGiftCardModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">Code</p>
                  <p className="font-mono text-zinc-900">{giftCardDetails.code}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">Balance</p>
                  <p className="font-bold text-green-600">${(giftCardDetails.balance ?? giftCardDetails.value)?.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">Usage History</h3>
                {giftCardDetails.history && giftCardDetails.history.length > 0 ? (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 text-xs text-zinc-500 font-bold uppercase">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Used</th>
                          <th className="px-4 py-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {giftCardDetails.history.map((h, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-zinc-600">{new Date(h.usedAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-red-600">-${h.amountUsed?.toFixed(2)}</td>
                            <td className="px-4 py-2 font-medium">${h.balanceAfter?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No previous usage history.</p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3 shrink-0">
              <Button variant="outline" onClick={() => setIsGiftCardModalOpen(false)} className="flex-1 font-bold border-zinc-200 text-zinc-700 shadow-none">
                No, Cancel
              </Button>
              <Button onClick={handleApplyGiftCard} className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none">
                Yes, Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OPTIONS MODAL */}
      {isOptionsModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{selectedProduct.name}</h2>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">Select variations and extras</p>
              </div>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="flex text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 border-b border-zinc-100 pb-2 px-3">
                  <div className="flex-1">Option</div>
                  <div className="w-16 text-center">Base</div>
                  <div className="w-20 text-center">Discount</div>
                  <div className="w-20 text-center">Tax</div>
                  <div className="w-24 text-right">Final Price</div>
                </div>

                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[13px] font-bold text-zinc-900 mb-2 block">Variants</span>
                    <div className="grid gap-2">
                      {selectedProduct.variants.map((v, idx) => {
                        const discountAmount = calculateItemDiscount(selectedProduct, v.price);
                        const discountedPrice = Math.max(0, v.price - discountAmount);
                        const taxAmount = calculateItemTax(selectedProduct, discountedPrice);
                        const finalPrice = discountedPrice + taxAmount;

                        return (
                          <label
                            key={idx}
                            className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors group ${
                              selectedSize === v.size ? "border-orange-500 bg-orange-50/30" : "border-zinc-200 hover:border-orange-300"
                            }`}
                          >
                            <div className={`flex-1 flex items-center gap-3 text-[14px] font-bold ${selectedSize === v.size ? "text-zinc-900" : "text-zinc-700 group-hover:text-zinc-900"}`}>
                              <input
                                type="radio"
                                name="size"
                                checked={selectedSize === v.size}
                                onChange={() => setSelectedSize(v.size)}
                                className="w-4 h-4 accent-orange-500"
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
                  </div>
                )}

                {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-zinc-100 space-y-2">
                    <span className="text-[13px] font-bold text-zinc-900 mb-2 block">Extras</span>
                    <div className="grid gap-2">
                      {selectedProduct.addons.map((addon) => {
                        const isChecked = selectedAddons.some(a => a._id === addon._id);
                        const discountAmount = calculateItemDiscount(selectedProduct, addon.price);
                        const discountedPrice = Math.max(0, addon.price - discountAmount);
                        const taxAmount = calculateItemTax(selectedProduct, discountedPrice);
                        const finalPrice = discountedPrice + taxAmount;

                        return (
                          <label
                            key={addon._id}
                            className="flex items-center border border-zinc-200 p-3 rounded-lg cursor-pointer hover:border-orange-300 transition-colors group"
                          >
                            <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-700 group-hover:text-zinc-900">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAddon(addon)}
                                className="w-4 h-4 accent-orange-500 rounded"
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
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex gap-3 shrink-0 rounded-b-2xl">
              <Button onClick={() => setIsOptionsModalOpen(false)} variant="outline" className="flex-1 h-12 border-zinc-300 font-bold text-zinc-700 shadow-none hover:bg-white">
                Cancel
              </Button>
              <Button
                onClick={addModifiedItemToCart}
                className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ORDER CONFIRMATION MODAL */}
      {isClearOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">Clear Order?</h3>
            <p className="text-zinc-500 font-medium mb-6">
              Are you sure you want to remove all items from the current order? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 font-bold border-zinc-200"
                onClick={() => setIsClearOrderModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={handleClearOrder}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
