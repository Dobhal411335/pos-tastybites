"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, CheckCircle2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ApplyDiscountsPage() {
  const [appliedDiscounts, setAppliedDiscounts] = useState([
    { id: 1, code: "TASTY15", targetType: "Category", targetName: "Gourmet Hamburgers", active: true },
    { id: 2, code: "WELCOME5", targetType: "Product", targetName: "Spicy Garlic Shrimp", active: true },
  ]);

  const [selectedCode, setSelectedCode] = useState("TASTY15");
  const [selectedMenuCategory, setSelectedMenuCategory] = useState("Gourmet Hamburgers");
  const [selectedProduct, setSelectedProduct] = useState("Spicy Garlic Shrimp");
  
  // Decide whether to apply to category or product
  const [targetMode, setTargetMode] = useState("Category"); // 'Category' or 'Product'

  const handleApplyCoupon = (e) => {
    e.preventDefault();

    const targetName = targetMode === "Category" ? selectedMenuCategory : selectedProduct;
    
    // Check duplication
    const duplicate = appliedDiscounts.some(
      (d) => d.code === selectedCode && d.targetType === targetMode && d.targetName === targetName
    );

    if (duplicate) {
      toast.error("This discount is already applied to this selection.");
      return;
    }

    const newApplication = {
      id: Date.now(),
      code: selectedCode,
      targetType: targetMode,
      targetName,
      active: true,
    };

    setAppliedDiscounts([...appliedDiscounts, newApplication]);
    toast.success(`Discount ${selectedCode} applied to ${targetName}!`);
  };

  const handleDeleteApplication = (id) => {
    setAppliedDiscounts(appliedDiscounts.filter((d) => d.id !== id));
    toast.success("Applied discount mapping removed.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Apply Coupon to Menu / Products
          </h2>
          <p className="text-xs text-zinc-400">
            Map active discount codes to entire menu categories or select standalone products.
          </p>
        </div>
        <Link href="/admin/menu/products">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Products</span>
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <form onSubmit={handleApplyCoupon} className="space-y-5 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200 max-w-2xl">
        
        {/* Select Discount Offer Coupon Code */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Select Discount Offer Coupon Code
          </label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-mono font-bold"
          >
            <option value="TASTY15">TASTY15 (15% OFF)</option>
            <option value="WELCOME5">WELCOME5 ($5.00 OFF)</option>
          </select>
        </div>

        {/* Target selection Mode toggle */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Apply Target Selection
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setTargetMode("Category")}
              className={`flex-1 py-3 text-xs uppercase font-extrabold tracking-wider border rounded-[10px] transition-all ${
                targetMode === "Category"
                  ? "bg-[#FFF7ED] border-[#F97316] text-[#F97316]"
                  : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-55"
              }`}
            >
              Menu Category
            </button>
            
            <button
              type="button"
              onClick={() => setTargetMode("Product")}
              className={`flex-1 py-3 text-xs uppercase font-extrabold tracking-wider border rounded-[10px] transition-all ${
                targetMode === "Product"
                  ? "bg-[#FFF7ED] border-[#F97316] text-[#F97316]"
                  : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-55"
              }`}
            >
              Single Product
            </button>
          </div>
        </div>

        {/* Category selection */}
        {targetMode === "Category" ? (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Select Menu Category
            </label>
            <select
              value={selectedMenuCategory}
              onChange={(e) => setSelectedMenuCategory(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none"
            >
              <option value="Starters & Appetizers">Starters & Appetizers</option>
              <option value="Gourmet Hamburgers">Gourmet Hamburgers</option>
              <option value="Wood-Fired Pizzas">Wood-Fired Pizzas</option>
              <option value="Seasonal Desserts">Seasonal Desserts</option>
            </select>
          </div>
        ) : (
          /* Product selection */
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none"
            >
              <option value="Spicy Garlic Shrimp">Spicy Garlic Shrimp</option>
              <option value="Classic Cheese Beef Burger">Classic Cheese Beef Burger</option>
              <option value="Bacon Truffle Burger">Bacon Truffle Burger</option>
              <option value="Margherita Supreme Pizza">Margherita Supreme Pizza</option>
            </select>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-[#12A594] hover:bg-[#0f8b7b] text-white rounded-[10px] py-6 text-xs uppercase tracking-widest font-black"
        >
          Apply Coupon Target
        </Button>
      </form>

      {/* Applied discounts table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Active Coupon Mappings Overview
        </h3>
        
        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span>Promotion Code</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 font-black text-center w-40">Apply On (Type)</th>
                <th className="p-4 font-black text-center w-52">Target Name</th>
                <th className="p-4 font-black text-center w-28">Status</th>
                <th className="p-4 font-black text-center w-24">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {appliedDiscounts.map((ad) => (
                <tr key={ad.id} className="hover:bg-zinc-50">
                  <td className="p-4 font-mono font-bold text-zinc-900">{ad.code}</td>
                  <td className="p-4 text-center font-bold text-zinc-400">
                    <span className="bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded text-[10px]">
                      {ad.targetType}
                    </span>
                  </td>
                  <td className="p-4 text-center font-extrabold text-zinc-800">{ad.targetName}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[10px] text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteApplication(ad.id)}
                      className="text-zinc-400 hover:text-red-550 p-1"
                    >
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
