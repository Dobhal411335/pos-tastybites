"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, List, LogIn, ShoppingCart, Tag, UtensilsCrossed, Receipt, Plus, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { Loader2 } from "lucide-react";
import { generateStaffOrderNumber } from "@/utils/generateOrderNumber";

export default function StaffCreateOrderPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);

  const [cart, setCart] = useState([]);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuCategory, setMenuCategory] = useState("all");
  const [specialNote, setSpecialNote] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  
  const [discountInputType, setDiscountInputType] = useState("discount"); // 'discount' or 'giftcard'
  const [giftcardCode, setGiftcardCode] = useState("");
  const [appliedGiftcard, setAppliedGiftcard] = useState(null);

  // Final Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState("");

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes, staffRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/products"),
        fetch("/api/employees")
      ]);

      const [catJson, prodJson, staffJson] = await Promise.all([
        catRes.json(),
        prodRes.json(),
        staffRes.json()
      ]);

      if (catJson.success) setCategories(catJson.data);
      if (prodJson.success) setMenuItems(prodJson.data);
      if (staffJson.success) setStaffMembers(staffJson.data);
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
    setGeneratedOrderId(generateStaffOrderNumber());
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
    if (item.discount && item.discount.status === 'Active') {
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

  const applyGiftcard = async () => {
    if (!giftcardCode) {
      toast.error("Enter a giftcard code");
      return;
    }
    try {
      const res = await fetch("/api/menu/giftcards/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: giftcardCode })
      });
      const json = await res.json();
      if (json.success) {
        setAppliedGiftcard(json.data);
        toast.success("Giftcard applied!");
      } else {
        toast.error(json.message);
        setAppliedGiftcard(null);
      }
    } catch (error) {
      toast.error("Failed to apply giftcard");
    }
  };

  const removeGiftcard = () => {
    setAppliedGiftcard(null);
    setGiftcardCode("");
  };

  const handlePlaceOrderClick = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    if (!selectedStaff) {
      toast.error("Please select a staff member");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        orderNumber: generatedOrderId,
        items: cart,
        subTotal: grossSubtotal,
        taxTotal: totalTax,
        discountTotal: orderDiscountTotal + totalItemDiscounts,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        giftcardCode: appliedGiftcard ? appliedGiftcard.name : null,
        giftcardUsedAmount: giftcardDeduction,
        totalAmount: grandTotal,
        specialNote,
        staffId: selectedStaff
      };

      const res = await fetch("/api/orders/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Staff Order placed successfully!");
        setIsConfirmModalOpen(false);
        setCart([]);
        setSelectedStaff("");
        setSpecialNote("");
        setAppliedDiscount(null);
        setCouponCode("");
        setAppliedGiftcard(null);
        setGiftcardCode("");
        setGeneratedOrderId(generateStaffOrderNumber());
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

  const preGiftcardTotal = Math.max(0, netSubtotal + totalTax - orderDiscountTotal);

  let giftcardDeduction = 0;
  if (appliedGiftcard) {
    if (appliedGiftcard.discountType === 'percent') {
      giftcardDeduction = preGiftcardTotal * (appliedGiftcard.value / 100);
    } else {
      giftcardDeduction = Math.min(appliedGiftcard.balance, preGiftcardTotal);
    }
  }

  const grandTotal = Math.max(0, preGiftcardTotal - giftcardDeduction);

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-350 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Staff Order Creation
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Select items from the menu and assign to a staff member.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">

            {/* Left Column: Menu Selection */}
            <div className="space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-[#1e40af]" />
                    <CardTitle className="text-[18px] font-bold text-zinc-900">Menu List</CardTitle>
                  </div>
                  <div className="w-40">
                    <Select value={menuCategory} onValueChange={setMenuCategory}>
                      <SelectTrigger className="h-9 text-[13px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                        <SelectValue placeholder="All Items" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60 overflow-y-auto">
                        <SelectItem value="all">All Items</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  <div className="divide-y divide-zinc-100">
                    {menuItems
                      .filter(item => menuCategory === "all" || item.category?._id === menuCategory)
                      .map((item) => {
                        const hasOptions = (item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0);
                        const itemPrice = item.variants && item.variants.length > 0 ? item.variants[0].price : 0;
                        const itemTax = calculateItemTax(item, itemPrice);
                        return (
                          <div key={item._id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                            <div className="space-y-1">
                              <h4 className="font-bold text-[15px] text-zinc-900">{item.name}</h4>
                              <div className="flex items-center gap-3 text-[13px]">
                                <span className="font-bold text-[#F97316]">${itemPrice.toFixed(2)}</span>
                                <span className="text-zinc-500">Tax: ${itemTax.toFixed(2)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {hasOptions ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[12px] font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                                  onClick={() => handleOpenOptions(item)}
                                >
                                  <LogIn className="w-3.5 h-3.5 mr-1" /> Options
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="h-8 text-[12px] font-bold bg-zinc-100 text-zinc-500 hover:bg-zinc-100 border-none shadow-none">
                                  <List className="w-3.5 h-3.5 mr-1" /> No Options
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                className="h-8 text-[12px] font-bold bg-[#1e40af] hover:bg-blue-900 text-white"
                                onClick={() => handleAddToCart(item)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Cart & Billing */}
            <div className="space-y-6">

              {/* Cart Table */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[#1e40af]" />
                    <CardTitle className="text-[18px] font-bold text-zinc-900">Current Order</CardTitle>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 text-[13px] font-bold uppercase">
                    Order #001
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-3 px-4">Item</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-3 px-4 text-center">Size</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-3 px-4 text-center">Qty</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-3 px-4 text-center">Total</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-3 px-4 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                            Cart is empty. Add items from the menu.
                          </TableCell>
                        </TableRow>
                      ) : (
                        cart.map((c) => (
                          <TableRow key={c.cartId} className="hover:bg-zinc-50 transition-colors h-14">
                            <TableCell className="px-4">
                              <span className="font-bold text-[14px] text-zinc-900">{c.name}</span>
                              <div className="text-[11px] text-zinc-900 font-medium">${c.price.toFixed(2)} + ${c.tax.toFixed(2)} tax</div>
                              {c.options && c.options.length > 0 && (
                                <div className="text-[11px] text-zinc-900 mt-0.5 italic">
                                  + {c.options.join(", ")}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-4 text-center">
                              <Badge variant="outline" className="text-[11px] font-semibold text-zinc-600 bg-white border-zinc-200">
                                {c.size}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors font-bold text-[14px]"
                                  onClick={() => handleUpdateQty(c.cartId, -1)}
                                >
                                  -
                                </button>
                                <span className="font-bold text-[14px] text-zinc-700 w-4 text-center">{c.qty}</span>
                                <button
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors font-bold text-[14px]"
                                  onClick={() => handleUpdateQty(c.cartId, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 text-center font-bold text-[14px] text-[#F97316]">
                              ${((c.price + c.tax) * c.qty).toFixed(2)}
                            </TableCell>
                            <TableCell className="px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                                  onClick={() => removeFromCart(c.cartId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>


            </div>
          </div>
          {/* Billing Summary */}
          <div className="flex item-center w-full gap-6">

            {/* Notes & Discounts */}
            <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden w-1/2">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900">Special Note</label>
                  <textarea
                    placeholder="Add any special instructions here..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md min-h-20 p-3 text-[14px] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    value={specialNote}
                    onChange={(e) => setSpecialNote(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 border-b border-zinc-100 pb-2">
                    <button 
                      className={`text-[14px] font-bold pb-2 border-b-2 transition-colors ${discountInputType === 'discount' ? 'text-[#F97316] border-[#F97316]' : 'text-zinc-500 border-transparent hover:text-zinc-700'}`}
                      onClick={() => setDiscountInputType('discount')}
                    >
                      <Tag className="w-4 h-4 inline-block mr-1" /> Discount Code
                    </button>
                    <button 
                      className={`text-[14px] font-bold pb-2 border-b-2 transition-colors ${discountInputType === 'giftcard' ? 'text-[#F97316] border-[#F97316]' : 'text-zinc-500 border-transparent hover:text-zinc-700'}`}
                      onClick={() => setDiscountInputType('giftcard')}
                    >
                      <Tag className="w-4 h-4 inline-block mr-1" /> Giftcard
                    </button>
                  </div>

                  {discountInputType === 'discount' ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter Discount Code"
                        className="h-10 text-[14px] border-zinc-200 bg-white focus:ring-[#F97316]"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={!!appliedDiscount}
                      />
                      {appliedDiscount ? (
                        <Button variant="outline" className="h-10 px-4 font-bold text-red-600 hover:bg-red-50 border-red-200" onClick={removeCoupon}>
                          Remove
                        </Button>
                      ) : (
                        <Button variant="outline" className="h-10 px-4 font-bold text-zinc-700 hover:bg-zinc-50 border-zinc-200" onClick={applyCoupon}>
                          Apply
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter Giftcard Code"
                        className="h-10 text-[14px] border-zinc-200 bg-white focus:ring-[#F97316]"
                        value={giftcardCode}
                        onChange={(e) => setGiftcardCode(e.target.value.toUpperCase())}
                        disabled={!!appliedGiftcard}
                      />
                      {appliedGiftcard ? (
                        <Button variant="outline" className="h-10 px-4 font-bold text-red-600 hover:bg-red-50 border-red-200" onClick={removeGiftcard}>
                          Remove
                        </Button>
                      ) : (
                        <Button variant="outline" className="h-10 px-4 font-bold text-zinc-700 hover:bg-zinc-50 border-zinc-200" onClick={applyGiftcard}>
                          Apply
                        </Button>
                      )}
                    </div>
                  )}

                  {appliedDiscount && discountInputType === 'discount' && (
                    <p className="text-[12px] text-emerald-600 font-medium">
                      {appliedDiscount.code} applied (-{appliedDiscount.discountType === 'percent' ? `${appliedDiscount.value}%` : `$${appliedDiscount.value}`})
                    </p>
                  )}
                  {appliedGiftcard && discountInputType === 'giftcard' && (
                    <p className="text-[12px] text-emerald-600 font-medium">
                      {appliedGiftcard.code} applied (Bal: ${appliedGiftcard.balance.toFixed(2)})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Totals & Checkout */}
            <Card className="shadow-sm border-zinc-200 bg-zinc-900 text-white overflow-hidden flex flex-col w-1/2">
              <CardHeader className="pb-2">
                <CardTitle className="text-[18px] font-bold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#F97316]" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3 border-b border-zinc-700 pb-4">
                  <div className="flex justify-between items-center text-[14px] text-zinc-300 font-medium">
                    <span>Subtotal</span>
                    <span>${grossSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px] text-zinc-300 font-medium">
                    <span>Tax & Fees</span>
                    <span>${totalTax.toFixed(2)}</span>
                  </div>
                  {(totalItemDiscounts > 0 || orderDiscountTotal > 0) && (
                    <div className="flex justify-between items-center text-[14px] text-green-400 font-medium">
                      <span>Total Discounts</span>
                      <span>-${(totalItemDiscounts + orderDiscountTotal).toFixed(2)}</span>
                    </div>
                  )}
                  {giftcardDeduction > 0 && (
                    <div className="flex justify-between items-center text-[14px] text-[#3b82f6] font-medium">
                      <span>Giftcard Applied</span>
                      <span>-${giftcardDeduction.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[18px] font-bold text-zinc-100">Total Amount</span>
                    <span className="text-[28px] font-black text-[#F97316]">${grandTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    onClick={handlePlaceOrderClick}
                    className="w-full h-14 text-[16px] font-bold bg-[#F97316] hover:bg-[#e06510] text-white rounded-md shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    Place Order
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>

      {/* Item Option Modal */}
      {isOptionModalOpen && selectedItem && (
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
      )}

      {/* Final Confirm Modal for Staff */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-none bg-white animate-in zoom-in-95 duration-200 p-2">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#1e40af]" />
              </div>
              <CardTitle className="text-[22px] font-bold text-zinc-900">Confirm Staff Order</CardTitle>
              <CardDescription className="text-[14px]">Assign this order to a staff member.</CardDescription>
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

              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-zinc-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-500" /> Select Staff Member
                </label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af]">
                    <SelectValue placeholder="Choose staff..." />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                    {staffMembers.map(staff => (
                      <SelectItem key={staff._id} value={staff._id}>{staff.firstName} {staff.lastName} ({staff.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Confirm Assignment"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}