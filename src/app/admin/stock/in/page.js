"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

  const handleCreate = (e) => {
    e.preventDefault();
    toast.success("Stock In record created successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create Stock In
          </h2>
          <p className="text-xs text-zinc-400">
            Log new incoming stock to inventory.
          </p>
        </div>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To</span>
          </Button>
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleCreate} className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Stock Menu Head
            </label>
            <select
              name="menuHead"
              value={formData.menuHead}
              onChange={handleChange}
              className="bg-[#1e40af] text-white border-none rounded-[4px] h-11 px-4 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-[#F97316] sm:w-2/3"
            >
              <option value="">SELECT HERE</option>
              <option value="Produce">Produce</option>
              <option value="Dairy">Dairy</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Product Name
            </label>
            <div className="sm:w-2/3 flex gap-2">
              <select
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white border-none rounded-[4px] h-11 px-4 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-[#F97316]"
              >
                <option value="">SELECT HERE</option>
                <option value="Tomato">Tomato</option>
                <option value="Milk">Milk</option>
              </select>
              <div className="flex gap-1">
                <div className="bg-[#4b5563] text-white text-[10px] uppercase font-bold tracking-widest flex items-center justify-center px-4 rounded-[4px]">TYPE</div>
                <div className="bg-[#4b5563] text-white text-[10px] uppercase font-bold tracking-widest flex items-center justify-center px-4 rounded-[4px]">MEASURE</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Opening Balance
            </label>
            <div className="sm:w-2/3 bg-[#1e40af] text-white rounded-[4px] h-11 flex items-center px-4 text-xs font-bold uppercase tracking-wider opacity-90">
              {formData.openingBalance ? `$${formData.openingBalance}` : "OPENING BALANCE"}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Stock In
            </label>
            <div className="sm:w-2/3 flex gap-2">
              <Input
                type="date"
                name="stockDate"
                value={formData.stockDate}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] uppercase text-[10px] font-bold"
              />
              <Input
                type="text"
                name="qty"
                placeholder="QTY"
                value={formData.qty}
                onChange={handleChange}
                className="w-20 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-xs font-bold"
              />
              <Input
                type="text"
                name="value"
                placeholder=". VALUE"
                value={formData.value}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-b border-zinc-200 pb-6">
            <Button type="button" className="bg-[#ff0000] hover:bg-red-700 text-white rounded-[4px] h-10 px-6 font-bold text-xs uppercase tracking-widest">
              + ADD MORE
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3 leading-tight">
              Purchase Invoice<br/><span className="text-[8px] text-zinc-400 font-medium">OPTIONAL</span>
            </label>
            <div className="sm:w-2/3 flex gap-2">
              <Input
                type="text"
                name="invoiceNumber"
                placeholder="INVOICE NUMBER"
                value={formData.invoiceNumber}
                onChange={handleChange}
                className="flex-[2] bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-[10px] font-bold"
              />
              <Input
                type="text"
                name="tax"
                placeholder="TAX"
                value={formData.tax}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-[10px] font-bold"
              />
              <Input
                type="text"
                name="invoiceAmount"
                placeholder="AMOUNT"
                value={formData.invoiceAmount}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-[10px] font-bold"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#1e40af] hover:bg-blue-900 text-white rounded-[4px] h-14 font-bold text-lg uppercase tracking-widest mt-8"
        >
          Create Stock
        </Button>
      </form>
    </div>
  );
}
