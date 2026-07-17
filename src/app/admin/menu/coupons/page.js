"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, CheckCircle2, XCircle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function CouponsConfigPage() {
  const [coupons, setCoupons] = useState([
    { id: 1, code: "TASTY15", discountType: "percent", value: 15, start: "2026-07-01", end: "2026-08-31", active: true },
    { id: 2, code: "WELCOME5", discountType: "amount", value: 5, start: "2026-01-01", end: "2026-12-31", active: true },
  ]);

  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amountValue, setAmountValue] = useState("");
  const [percentValue, setPercentValue] = useState("");
  const [selectedType, setSelectedType] = useState("amount"); // 'amount' or 'percent'

  const handleCreateCoupon = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    const value = selectedType === "amount" ? parseFloat(amountValue) : parseFloat(percentValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid discount value.");
      return;
    }

    const newCoupon = {
      id: Date.now(),
      code: code.trim().toUpperCase(),
      discountType: selectedType,
      value,
      start: startDate || "2026-07-17",
      end: endDate || "2026-08-17",
      active: true,
    };

    setCoupons([...coupons, newCoupon]);
    setCode("");
    setAmountValue("");
    setPercentValue("");
    toast.success("Coupon created successfully!");
  };

  const handleToggleStatus = (id) => {
    setCoupons(
      coupons.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
    toast.info("Coupon status updated.");
  };

  const handleDeleteCoupon = (id) => {
    setCoupons(coupons.filter((c) => c.id !== id));
    toast.success("Coupon deleted.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create Discount & Coupon Offer
          </h2>
          <p className="text-xs text-zinc-400">
            Define promotional discount codes, validity dates, and flat or percent deductions.
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
      <form onSubmit={handleCreateCoupon} className="space-y-5 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200 max-w-2xl">
        
        {/* Code Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Discount Offer Coupon Code
          </label>
          <Input
            type="text"
            placeholder="e.g. SUMMER25"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm uppercase font-mono font-bold"
          />
        </div>

        {/* Date inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
            />
          </div>
        </div>

        {/* Price deduction types */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Deduction Type
          </label>
          <div className="flex gap-4 items-center">
            
            {/* Flat Amount option */}
            <div className="flex-1 flex gap-2 items-center">
              <input
                type="radio"
                id="type-amount"
                name="deduction-type"
                checked={selectedType === "amount"}
                onChange={() => setSelectedType("amount")}
                className="h-4 w-4 text-[#F97316] focus:ring-[#F97316]"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Price $ Amount"
                disabled={selectedType !== "amount"}
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
              />
            </div>

            <span className="text-xs font-bold text-zinc-400">OR</span>

            {/* Percentage option */}
            <div className="flex-1 flex gap-2 items-center">
              <input
                type="radio"
                id="type-percent"
                name="deduction-type"
                checked={selectedType === "percent"}
                onChange={() => setSelectedType("percent")}
                className="h-4 w-4 text-[#F97316] focus:ring-[#F97316]"
              />
              <Input
                type="number"
                placeholder="Percentage % Value"
                disabled={selectedType !== "percent"}
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
              />
            </div>

          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#12A594] hover:bg-[#0f8b7b] text-white rounded-[10px] py-6 text-xs uppercase tracking-widest font-black"
        >
          Create Coupon Offer
        </Button>
      </form>

      {/* Coupon List Table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Coupon Offer Overview
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
                <th className="p-4 font-black text-center w-36">Discount Value</th>
                <th className="p-4 font-black text-center w-40">Validity Period</th>
                <th className="p-4 font-black text-center w-28">Status</th>
                <th className="p-4 font-black text-center w-24">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="p-4 font-mono font-bold text-zinc-900">{c.code}</td>
                  <td className="p-4 text-center font-extrabold text-[#F97316]">
                    {c.discountType === "percent" ? `${c.value}% OFF` : `$${c.value.toFixed(2)} OFF`}
                  </td>
                  <td className="p-4 text-center text-zinc-400 font-bold">
                    <span className="bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded text-[10px]">
                      {c.start} to {c.end}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[10px] text-[8px] font-black uppercase tracking-wider ${
                        c.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {c.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteCoupon(c.id)}
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
