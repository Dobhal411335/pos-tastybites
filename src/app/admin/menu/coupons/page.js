"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Calendar, ArrowUpDown, Tag, MoreHorizontal, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    setStartDate("");
    setEndDate("");
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
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Discount & Coupon Offer
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Define promotional discount codes, validity dates, and flat or percent deductions.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 gap-8">

            {/* Form Section */}
            <div className="space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Coupon Details</CardTitle>
                  <CardDescription className="text-[14px]">Configure the code, deduction, and validity.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Code Input */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Discount Offer Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="e.g. SUMMER25"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="pl-10 h-11 text-[16px] bg-white uppercase font-mono font-bold tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Date inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-11 text-[15px] bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        End Date
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-11 text-[15px] bg-white"
                      />
                    </div>
                  </div>

                  {/* Deduction Section */}
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <label className="text-[14px] font-semibold text-zinc-900 mt-4 block">
                      Deduction Type & Value <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-6">

                      {/* Flat Amount Option */}
                      <label
                        className={`flex-1 flex flex-col gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedType === "amount" ? "border-[#F97316] bg-orange-50/30" : "border-zinc-200 hover:border-zinc-300 bg-white"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedType === "amount" ? "border-[#F97316]" : "border-zinc-300"}`}>
                            {selectedType === "amount" && <div className="w-2 h-2 rounded-full bg-[#F97316]" />}
                          </div>
                          <span className="text-[14px] font-bold text-zinc-900">Flat Amount ($)</span>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          disabled={selectedType !== "amount"}
                          value={amountValue}
                          onChange={(e) => {
                            setAmountValue(e.target.value);
                            setSelectedType("amount");
                          }}
                          onClick={() => setSelectedType("amount")}
                          className="h-11 text-[16px] bg-white font-medium"
                        />
                      </label>

                      {/* Percentage Option */}
                      <label
                        className={`flex-1 flex flex-col gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedType === "percent" ? "border-[#F97316] bg-orange-50/30" : "border-zinc-200 hover:border-zinc-300 bg-white"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedType === "percent" ? "border-[#F97316]" : "border-zinc-300"}`}>
                            {selectedType === "percent" && <div className="w-2 h-2 rounded-full bg-[#F97316]" />}
                          </div>
                          <span className="text-[14px] font-bold text-zinc-900">Percentage (%)</span>
                        </div>
                        <Input
                          type="number"
                          placeholder="0"
                          disabled={selectedType !== "percent"}
                          value={percentValue}
                          onChange={(e) => {
                            setPercentValue(e.target.value);
                            setSelectedType("percent");
                          }}
                          onClick={() => setSelectedType("percent")}
                          className="h-11 text-[16px] bg-white font-medium"
                        />
                      </label>

                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Sidebar Save Section */}
              <div className="lg:col-span-4 flex flex-col justify-end">
                <Button
                  type="submit"
                  className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  Create Coupon Offer
                </Button>
              </div>
            </div>

          </form>

          {/* Coupon List Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Coupon Offer Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                        <span>Promotion Code</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Discount Value</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Validity Period</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length > 0 ? coupons.map((c) => (
                    <TableRow key={c.id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-zinc-400" />
                          <span className="font-mono font-bold text-[15px] text-zinc-900 tracking-wide">{c.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                        {c.discountType === "percent" ? `${c.value}% OFF` : `$${c.value.toFixed(2)} OFF`}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[13px] font-medium">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {c.start} to {c.end}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c.id)}
                          className="cursor-pointer transition-transform hover:scale-105"
                        >
                          {c.active ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Inactive
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 bg-white">
                            <DropdownMenuItem className="text-[14px] font-medium cursor-pointer">
                              <Edit /> Edit Discount
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteCoupon(c.id)}
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        >
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-zinc-500 text-[14px]">No coupons found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
