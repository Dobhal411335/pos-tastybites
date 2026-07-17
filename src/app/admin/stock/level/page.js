"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function StockLevelPage() {
  const [searchMenuHead, setSearchMenuHead] = useState("");

  const [stockLevels, setStockLevels] = useState([
    { id: 1, name: "Tomato", highValue: "150 - 45", currentBalance: "105", measure: "kg", status: "Active" },
    { id: 2, name: "Milk", highValue: "50 - 12", currentBalance: "38", measure: "L", status: "Active" },
  ]);

  const handleDelete = (id) => {
    setStockLevels(stockLevels.filter((s) => s.id !== id));
    toast.success("Stock level record deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Current Stock Level
          </h2>
          <p className="text-xs text-zinc-400">
            View total inventory balances.
          </p>
        </div>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To</span>
          </Button>
        </Link>
      </div>

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
                <th className="p-4 font-black text-center border-r border-blue-900">
                  <div className="leading-tight">
                    HIGH VALUE<br/>IN - OUT
                  </div>
                </th>
                <th className="p-4 font-black text-center border-r border-blue-900">Current Balance</th>
                <th className="p-4 font-black text-center border-r border-blue-900">Measure</th>
                <th className="p-4 font-black text-center w-24 border-r border-blue-900">Status</th>
                <th className="p-4 font-black text-center w-20">Delete <Edit className="h-3 w-3 inline ml-1" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-zinc-400 text-xs text-white font-bold">
              {stockLevels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-100 font-bold uppercase tracking-wider">
                    No records found.
                  </td>
                </tr>
              ) : (
                stockLevels.map((s, idx) => (
                  <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-zinc-600' : 'bg-zinc-400'} hover:bg-zinc-500 border-b border-zinc-500`}>
                    <td className="p-4 border-r border-white/20">{s.name}</td>
                    <td className="p-4 text-center border-r border-white/20">{s.highValue}</td>
                    <td className="p-4 text-center border-r border-white/20">{s.currentBalance}</td>
                    <td className="p-4 text-center border-r border-white/20">{s.measure}</td>
                    <td className="p-4 text-center border-r border-white/20">{s.status}</td>
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
