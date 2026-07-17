"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function StockCategoryPage() {
  const [categories, setCategories] = useState([
    { id: 1, name: "Produce", status: "Active" },
    { id: 2, name: "Dairy", status: "Active" },
    { id: 3, name: "Dry Goods", status: "Active" },
    { id: 4, name: "Meat", status: "Inactive" },
    { id: 5, name: "Cleaning Supplies", status: "Active" },
  ]);

  const [menuHead, setMenuHead] = useState("");

  const handleCreate = (e) => {
    e.preventDefault();
    if (!menuHead.trim()) return;
    setCategories([...categories, { id: Date.now(), name: menuHead, status: "Active" }]);
    setMenuHead("");
    toast.success("Stock menu head created successfully.");
  };

  const handleDelete = (id) => {
    setCategories(categories.filter((c) => c.id !== id));
    toast.success("Category deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Stock Type Category
          </h2>
          <p className="text-xs text-zinc-400">
            Define main categories for your stock products.
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
      <form onSubmit={handleCreate} className="space-y-6 max-w-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
            Stock Menu Head
          </label>
          <Input
            type="text"
            placeholder="Type Here"
            value={menuHead}
            onChange={(e) => setMenuHead(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#12A594] sm:w-2/3"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#1e40af] hover:bg-blue-900 text-white rounded-[10px] h-12 font-bold text-sm uppercase tracking-widest"
        >
          Create Menu Head
        </Button>
      </form>

      {/* Overview Table */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-extrabold text-zinc-900">
          Overview
        </h3>

        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e40af] text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">Menu Head</th>
                <th className="p-4 font-black text-center w-32">Status</th>
                <th className="p-4 font-black text-center w-24">Delete <Edit className="h-3 w-3 inline ml-1" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-zinc-400 font-bold uppercase tracking-wider">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="p-4 font-bold text-zinc-900">{c.name}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-wider ${
                        c.status === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-red-50 text-red-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-zinc-400 hover:text-red-550 p-1"
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
