"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, PackagePlus, PlusCircle, Receipt, ClipboardList, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function StockInPage() {
  const [formData, setFormData] = useState({
    menuHead: "",
    productName: "",
    openingBalance: "150.00", // mocked balance
    stockDate: "",
    qty: "",
    value: "",
    invoiceNumber: "",
    tax: "",
    invoiceAmount: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    toast.success("Stock In record created successfully.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Stock In
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Log new incoming stock to inventory and update balances.
              </p>
            </div>

          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Main Form Section */}
            <div className="lg:col-span-8 space-y-6">

              {/* Product Details Card */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#1e40af]" /> Product Selection
                  </CardTitle>
                  <CardDescription className="text-[14px]">Choose the product and view its current opening balance.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Stock Menu Head <span className="text-red-500">*</span>
                      </label>
                      <Select value={formData.menuHead} onValueChange={(val) => handleSelectChange("menuHead", val)}>
                        <SelectTrigger className="h-11 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                          <SelectItem value="Produce">Produce</SelectItem>
                          <SelectItem value="Dairy">Dairy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <Select value={formData.productName} onValueChange={(val) => handleSelectChange("productName", val)}>
                        <SelectTrigger className="h-11 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                          <SelectItem value="Tomato">Tomato</SelectItem>
                          <SelectItem value="Milk">Milk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.productName && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex flex-col justify-center">
                        <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Product Type / Measure</span>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[12px] font-bold rounded-md">RAW MATERIAL</span>
                          <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[12px] font-bold rounded-md">KG / LTR</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col justify-center relative overflow-hidden">
                        <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-blue-100 opacity-50" />
                        <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-1 relative z-10">Current Opening Balance</span>
                        <span className="text-[24px] font-bold text-blue-900 relative z-10">${formData.openingBalance}</span>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Stock In Entry Card */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <PackagePlus className="w-5 h-5 text-[#1e40af]" /> Stock Entry
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">

                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <label className="text-[14px] font-semibold text-zinc-900">Date Received</label>
                      <Input
                        type="date"
                        name="stockDate"
                        value={formData.stockDate}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                    <div className="space-y-2 w-full sm:w-32">
                      <label className="text-[14px] font-semibold text-zinc-900">Quantity</label>
                      <Input
                        type="number"
                        name="qty"
                        placeholder="QTY"
                        value={formData.qty}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-[14px] font-semibold text-zinc-900">Total Value ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        name="value"
                        placeholder="0.00"
                        value={formData.value}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-zinc-100 mt-6">
                    <Button type="button" variant="outline" className="h-10 px-4 text-[14px] font-bold text-zinc-700 border-zinc-300 hover:bg-zinc-50 flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" /> Add Another Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Sidebar Invoice & Save Section */}
            <div className="lg:col-span-4 space-y-6">

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#1e40af]" /> Purchase Invoice
                  </CardTitle>
                  <CardDescription className="text-[14px]">Optional invoice documentation.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">Invoice Number</label>
                    <Input
                      type="text"
                      name="invoiceNumber"
                      placeholder="e.g. INV-2026-892"
                      value={formData.invoiceNumber}
                      onChange={handleChange}
                      className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] uppercase font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">Tax ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        name="tax"
                        placeholder="0.00"
                        value={formData.tax}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">Amount ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        name="invoiceAmount"
                        placeholder="0.00"
                        value={formData.invoiceAmount}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full h-14 text-[16px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                style={{ backgroundColor: "#1e40af" }}
              >
                Submit Stock Entry
              </Button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
