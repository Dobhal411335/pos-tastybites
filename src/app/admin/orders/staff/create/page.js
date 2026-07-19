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

export default function StaffCreateOrderPage() {
  const [cart, setCart] = useState([]);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuCategory, setMenuCategory] = useState("all");

  // Final Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");

  // Mock Menu Items
  const menuItems = [
    { id: 1, name: "Pizza Margherita", price: 20.54, tax: 4.30, hasOptions: true, category: "Pizza" },
    { id: 2, name: "Bolognese Pasta", price: 20.54, tax: 4.30, hasOptions: true, category: "Pasta" },
    { id: 3, name: "Garlic Bread", price: 20.54, tax: 4.30, hasOptions: false, category: "Sides" },
    { id: 4, name: "Caesar Salad", price: 20.54, tax: 4.30, hasOptions: false, category: "Sides" },
    { id: 5, name: "Tiramisu", price: 20.54, tax: 4.30, hasOptions: true, category: "Dessert" },
  ];

  // Mock Staff Members
  const staffMembers = [
    { id: "S001", name: "John Doe" },
    { id: "S002", name: "Jane Smith" },
    { id: "S003", name: "Alex Johnson" },
  ];

  const handleOpenOptions = (item) => {
    setSelectedItem(item);
    setIsOptionModalOpen(true);
  };

  const handleAddToCart = (item) => {
    if (item.hasOptions) {
      handleOpenOptions(item);
    } else {
      setCart([...cart, { ...item, cartId: Date.now(), qty: 1, size: "Standard" }]);
      toast.success(`${item.name} added to cart.`);
    }
  };

  const addOptionToCart = () => {
    setCart([...cart, { ...selectedItem, cartId: Date.now(), qty: 1, size: "Medium: 32cm" }]);
    setIsOptionModalOpen(false);
    toast.success(`${selectedItem.name} added to cart.`);
  };

  const handlePlaceOrderClick = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleFinalConfirm = () => {
    if (!selectedStaff) {
      toast.error("Please select a staff member");
      return;
    }
    toast.success("Order confirmed successfully!");
    setIsConfirmModalOpen(false);
    setCart([]);
    setSelectedStaff("");
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalTax = cart.reduce((acc, item) => acc + item.tax * item.qty, 0);
  const grandTotal = totalAmount + totalTax;

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1400px] mx-auto space-y-8 pb-16 font-sans">
          
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

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Column: Menu Selection */}
            <div className="xl:col-span-5 space-y-6">
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
                      <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="Pizza">Pizza</SelectItem>
                        <SelectItem value="Pasta">Pasta</SelectItem>
                        <SelectItem value="Sides">Sides</SelectItem>
                        <SelectItem value="Dessert">Dessert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  <div className="divide-y divide-zinc-100">
                    {menuItems
                      .filter(item => menuCategory === "all" || item.category === menuCategory)
                      .map((item) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="space-y-1">
                            <h4 className="font-bold text-[15px] text-zinc-900">{item.name}</h4>
                            <div className="flex items-center gap-3 text-[13px]">
                              <span className="font-bold text-[#F97316]">${item.price.toFixed(2)}</span>
                              <span className="text-zinc-500">Tax: ${item.tax.toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {item.hasOptions ? (
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
                                <List className="w-3.5 h-3.5 mr-1" /> Std
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Cart & Billing */}
            <div className="xl:col-span-7 space-y-6">
              
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
                              <div className="text-[11px] text-zinc-500 font-medium">${c.price.toFixed(2)} + ${c.tax.toFixed(2)} tax</div>
                            </TableCell>
                            <TableCell className="px-4 text-center">
                              <Badge variant="outline" className="text-[11px] font-semibold text-zinc-600 bg-white border-zinc-200">
                                {c.size}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 text-center font-bold text-[14px] text-zinc-700">{c.qty}</TableCell>
                            <TableCell className="px-4 text-center font-bold text-[14px] text-[#F97316]">
                              ${((c.price + c.tax) * c.qty).toFixed(2)}
                            </TableCell>
                            <TableCell className="px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button className="text-zinc-400 hover:text-zinc-800 transition-colors p-1">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                                  onClick={() => setCart(cart.filter(x => x.cartId !== c.cartId))}
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

              {/* Billing Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Notes & Discounts */}
                <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">Special Note</label>
                      <textarea 
                        placeholder="Add any special instructions here..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-md min-h-[80px] p-3 text-[14px] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-zinc-500" /> Discount Code
                      </label>
                      <div className="flex gap-2">
                        <Input placeholder="Enter Code" className="h-10 text-[14px] border-zinc-200 bg-white focus:ring-[#F97316]" />
                        <Button variant="outline" className="h-10 px-4 font-bold text-zinc-700 hover:bg-zinc-50 border-zinc-200">
                          Apply
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Totals & Checkout */}
                <Card className="shadow-sm border-zinc-200 bg-zinc-900 text-white overflow-hidden flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[18px] font-bold flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-[#F97316]" /> Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-3 border-b border-zinc-700 pb-4">
                      <div className="flex justify-between items-center text-[14px] text-zinc-300 font-medium">
                        <span>Subtotal</span>
                        <span>${totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[14px] text-zinc-300 font-medium">
                        <span>Tax & Fees</span>
                        <span>${totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[14px] text-green-400 font-medium">
                        <span>Discount</span>
                        <span>-$0.00</span>
                      </div>
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
                <div className="w-24 text-center">Discount</div>
                <div className="w-24 text-center">Price</div>
              </div>

              {/* Radio Options */}
              <div className="space-y-2">
                <label className="flex items-center border border-zinc-200 p-3 rounded-lg cursor-pointer hover:border-[#F97316] transition-colors group">
                  <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-700 group-hover:text-zinc-900">
                    <input type="radio" name="size" className="w-4 h-4 accent-[#F97316]" />
                    <span>Small: 26cm</span>
                  </div>
                  <div className="w-24 text-center text-zinc-400 font-medium text-[13px]">-</div>
                  <div className="w-24 text-center font-bold text-[14px] text-zinc-900">${selectedItem.price.toFixed(2)}</div>
                </label>

                <label className="flex items-center border-2 border-[#F97316] bg-orange-50/30 p-3 rounded-lg cursor-pointer">
                  <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-900">
                    <input type="radio" name="size" defaultChecked className="w-4 h-4 accent-[#F97316]" />
                    <span>Medium: 32cm</span>
                  </div>
                  <div className="w-24 text-center text-emerald-600 font-bold text-[12px] bg-emerald-50 py-1 rounded-md">10% OFF</div>
                  <div className="w-24 text-center font-bold text-[14px] text-zinc-900">${selectedItem.price.toFixed(2)}</div>
                </label>

                <label className="flex items-center border border-zinc-200 p-3 rounded-lg cursor-pointer hover:border-[#F97316] transition-colors group">
                  <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-700 group-hover:text-zinc-900">
                    <input type="radio" name="size" className="w-4 h-4 accent-[#F97316]" />
                    <span>Large: 45cm</span>
                  </div>
                  <div className="w-24 text-center text-emerald-600 font-bold text-[12px] bg-emerald-50 py-1 rounded-md">10% OFF</div>
                  <div className="w-24 text-center font-bold text-[14px] text-zinc-900">${selectedItem.price.toFixed(2)}</div>
                </label>
              </div>

              {/* Extras */}
              <div className="pt-4 mt-4 border-t border-zinc-100">
                <span className="text-[13px] font-bold text-zinc-900 mb-3 block">Extras</span>
                <label className="flex items-center border border-zinc-200 p-3 rounded-lg cursor-pointer hover:border-[#F97316] transition-colors group">
                  <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-700 group-hover:text-zinc-900">
                    <input type="checkbox" className="w-4 h-4 accent-[#F97316] rounded" />
                    <span>Extra Cheese</span>
                  </div>
                  <div className="w-24 text-center text-zinc-400 font-medium text-[13px]">-</div>
                  <div className="w-24 text-center font-bold text-[14px] text-zinc-900">+$2.00</div>
                </label>
              </div>
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
          <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden bg-white animate-in zoom-in-95 duration-200 p-2">
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
                  <span className="font-bold text-[15px] text-zinc-900">#001</span>
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
                      <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.id})</SelectItem>
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
                >
                  Confirm Assignment
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
