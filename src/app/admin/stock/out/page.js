"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function StockOutPage() {
  const [formData, setFormData] = useState({
    menuHead: "",
    productName: "",
    openingBalance: "150.00", // mocked balance
    stockDate: "",
    qty: "",
    value: "",
  });

  const [searchMenuHead, setSearchMenuHead] = useState("");

  const [stockOuts, setStockOuts] = useState([
    { id: 1, name: "Tomato", stock: "45", log: "View", type: "Raw", measure: "kg", status: "Active" },
    { id: 2, name: "Milk", stock: "12", log: "View", type: "Liquid", measure: "L", status: "Active" },
  ]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    toast.success("Stock Out record added and balanced.");
  };

  const handleDelete = (id) => {
    setStockOuts(stockOuts.filter((s) => s.id !== id));
    toast.success("Record deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create Stock Out
          </h2>
          <p className="text-xs text-zinc-400">
            Log outgoing stock and balance inventory.
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
      <form onSubmit={handleCreate} className="space-y-6 max-w-2xl border-b border-zinc-200 pb-10">
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
              Stock Out
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

          <div className="flex justify-end pt-2">
            <Button type="button" className="bg-[#ff0000] hover:bg-red-700 text-white rounded-[4px] h-10 px-6 font-bold text-xs uppercase tracking-widest">
              + ADD MORE
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#1e40af] hover:bg-blue-900 text-white rounded-[4px] h-14 font-bold text-lg uppercase tracking-widest mt-8"
        >
          Balance Stock
        </Button>
      </form>

      {/* Overview Table */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-extrabold text-zinc-900">
          Overview
        </h3>
        
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4 max-w-5xl">
          <div className="w-full sm:w-1/2">
            <select
              value={searchMenuHead}
              onChange={(e) => setSearchMenuHead(e.target.value)}
              className="w-full bg-[#1e40af] text-white border-none rounded-none rounded-t-[4px] h-11 px-4 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-[#F97316] uppercase"
            >
              <option value="">SEARCH MENU HEAD</option>
              <option value="Produce">Produce</option>
              <option value="Dairy">Dairy</option>
            </select>
          </div>
          
          <div className="text-zinc-900 font-extrabold text-sm mb-2">
            Current Date Status
          </div>
        </div>

        <div className="overflow-x-auto border border-[#ECECEC] rounded-[4px] rounded-tl-none overflow-hidden mt-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e40af] text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black border-r border-blue-900">Product Name</th>
                <th className="p-4 font-black text-center border-r border-blue-900">Stock</th>
                <th className="p-4 font-black text-center border-r border-blue-900">Log <Eye className="h-3 w-3 inline ml-1" /></th>
                <th className="p-4 font-black text-center border-r border-blue-900">Type</th>
                <th className="p-4 font-black text-center border-r border-blue-900">Measure</th>
                <th className="p-4 font-black text-center w-24 border-r border-blue-900">Status</th>
                <th className="p-4 font-black text-center w-20">Delete <Edit className="h-3 w-3 inline ml-1" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-zinc-400 text-xs text-white font-bold">
              {stockOuts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-100 font-bold uppercase tracking-wider">
                    No records found.
                  </td>
                </tr>
              ) : (
                stockOuts.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-500 border-b border-zinc-500">
                    <td className="p-4 border-r border-zinc-500">{s.name}</td>
                    <td className="p-4 text-center border-r border-zinc-500">{s.stock}</td>
                    <td className="p-4 text-center border-r border-zinc-500 text-zinc-200 underline cursor-pointer">{s.log}</td>
                    <td className="p-4 text-center border-r border-zinc-500">{s.type}</td>
                    <td className="p-4 text-center border-r border-zinc-500">{s.measure}</td>
                    <td className="p-4 text-center border-r border-zinc-500">{s.status}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-white hover:text-red-300 p-1"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
