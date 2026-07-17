"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Search, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function TaxDetailsPage() {
  const [taxes, setTaxes] = useState([
    { id: 1, name: "State Sales Tax", rate: "5%", type: "Exclusive", status: "Active" },
    { id: 2, name: "Local City Tax", rate: "2%", type: "Exclusive", status: "Active" },
    { id: 3, name: "VAT", rate: "10%", type: "Inclusive", status: "Inactive" },
    { id: 4, name: "Liquor Tax", rate: "8%", type: "Exclusive", status: "Active" },
  ]);

  const [searchName, setSearchName] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [filterQuery, setFilterQuery] = useState({ name: "", status: "" });

  const handleSearch = (e) => {
    e.preventDefault();
    setFilterQuery({ name: searchName.trim(), status: searchStatus.trim() });
  };

  const filteredTaxes = taxes.filter((t) => {
    const matchesName = t.name.toLowerCase().includes(filterQuery.name.toLowerCase());
    const matchesStatus = t.status.toLowerCase().includes(filterQuery.status.toLowerCase());
    return matchesName && matchesStatus;
  });

  const handleDelete = (id) => {
    setTaxes(taxes.filter((t) => t.id !== id));
    toast.success("Tax record deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Tax Details
          </h2>
          <p className="text-xs text-zinc-400">
            Search tax configuration information and view applied tax rates.
          </p>
        </div>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Dashboard</span>
          </Button>
        </Link>
      </div>

      {/* Search Filters */}
      <form onSubmit={handleSearch} className="space-y-4 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Search Option
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
              Type Tax Name
            </label>
            <Input
              type="text"
              placeholder="e.g. VAT"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
              Status
            </label>
            <Input
              type="text"
              placeholder="e.g. Active"
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
            />
          </div>

          <Button
            type="submit"
            className="bg-[#F97316] hover:bg-[#e06510] text-white rounded-[10px] h-11 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </Button>
        </div>
      </form>

      {/* Tax Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
            Configured Taxes
          </h3>
          <Button type="button" className="bg-[#12A594] hover:bg-[#0f8b7c] text-white font-bold text-xs uppercase tracking-widest rounded-[10px] flex items-center gap-1.5 px-4 h-10">
            <Percent className="h-4 w-4" />
            <span>Create New Tax</span>
          </Button>
        </div>

        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">Tax Name</th>
                <th className="p-4 font-black text-center w-40">Rate</th>
                <th className="p-4 font-black text-center w-52">Type</th>
                <th className="p-4 font-black text-center w-40">Status</th>
                <th className="p-4 font-black text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {filteredTaxes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400 font-bold uppercase tracking-wider">
                    No tax configuration found matching filters.
                  </td>
                </tr>
              ) : (
                filteredTaxes.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50">
                    <td className="p-4 font-bold text-zinc-900">{t.name}</td>
                    <td className="p-4 text-center font-extrabold text-[#F97316]">{t.rate}</td>
                    <td className="p-4 text-center text-zinc-450 font-bold">{t.type}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-wider ${
                        t.status === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-red-50 text-red-600'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(t.id)}
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
