"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Download, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function GuestPerformancePage() {
  const [performers, setPerformers] = useState([
    { id: 1, name: "Alexander Wright", totalOrders: 42, email: "alex.wright@gmail.com" },
    { id: 2, name: "Emily Watson", totalOrders: 35, email: "emilyw@outlook.com" },
    { id: 3, name: "Chantel Tremblay", totalOrders: 28, email: "c.tremblay@yahoo.ca" },
    { id: 4, name: "Marcus Johnson", totalOrders: 19, email: "mjohnson@hotmail.com" },
  ]);

  const [sortOrder, setSortOrder] = useState("HIGHEST");
  const [activeSortOrder, setActiveSortOrder] = useState("HIGHEST");

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSortOrder(sortOrder);
    toast.success(`Sorted food order volume: ${sortOrder}`);
  };

  const sortedPerformers = [...performers].sort((a, b) => {
    if (activeSortOrder === "HIGHEST") {
      return b.totalOrders - a.totalOrders;
    } else {
      return a.totalOrders - b.totalOrders;
    }
  });

  const handleDelete = (id) => {
    setPerformers(performers.filter((p) => p.id !== id));
    toast.success("Guest performance audit record removed.");
  };

  const handleView = (name, count) => {
    toast.info(`${name} has ordered ${count} items across multiple reservations.`);
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Performance Status
          </h2>
          <p className="text-xs text-zinc-400">
            Identify top dining guests and food order volume metrics.
          </p>
        </div>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Dashboard</span>
          </Button>
        </Link>
      </div>

      {/* Sort selection filter */}
      <form onSubmit={handleSearch} className="space-y-4 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Search Option : Food Order Volume (Highest to Lowest)
        </h3>
        
        <div className="flex gap-4 max-w-md items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
              Volume Order Selection
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-bold"
            >
              <option value="HIGHEST">HIGHEST TO LOWEST</option>
              <option value="LOWEST">LOWEST TO HIGHEST</option>
            </select>
          </div>

          <Button
            type="submit"
            className="bg-[#F97316] hover:bg-[#e06510] text-white rounded-[10px] h-11 px-6 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </Button>
        </div>
      </form>

      {/* Performance audit table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Top Guest Volume Rankings
        </h3>

        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">Maximum Order Guest</th>
                <th className="p-4 font-black text-center w-40">Order History</th>
                <th className="p-4 font-black text-center w-36">Total Orders</th>
                <th className="p-4 font-black text-center w-24">View</th>
                <th className="p-4 font-black text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {sortedPerformers.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="p-4 font-bold text-zinc-900">{p.name}</td>
                  
                  {/* Download PDF */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => toast.success(`Downloading order history PDF for ${p.name}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </td>

                  {/* Total Orders */}
                  <td className="p-4 text-center font-extrabold text-[#F97316] text-sm">
                    {p.totalOrders} Orders
                  </td>

                  {/* View Details */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleView(p.name, p.totalOrders)}
                      className="text-zinc-500 hover:text-[#F97316] transition-colors p-1"
                    >
                      <Eye className="h-4 w-4 mx-auto" />
                    </button>
                  </td>

                  {/* Delete audit log */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(p.id)}
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
