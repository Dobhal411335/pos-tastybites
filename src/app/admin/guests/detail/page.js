"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function GuestDetailPage() {
  const [guests, setGuests] = useState([
    { id: 1, name: "Alexander Wright", email: "alex.wright@gmail.com", phone: "+1 604-555-0192" },
    { id: 2, name: "Chantel Tremblay", email: "c.tremblay@yahoo.ca", phone: "+1 514-555-0183" },
    { id: 3, name: "Emily Watson", email: "emilyw@outlook.com", phone: "+1 416-555-0122" },
    { id: 4, name: "Marcus Johnson", email: "mjohnson@hotmail.com", phone: "+1 780-555-0145" },
  ]);

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterQuery, setFilterQuery] = useState({ name: "", phone: "" });

  const handleSearch = (e) => {
    e.preventDefault();
    setFilterQuery({ name: searchName.trim(), phone: searchPhone.trim() });
  };

  const filteredGuests = guests.filter((g) => {
    const matchesName = g.name.toLowerCase().includes(filterQuery.name.toLowerCase());
    const matchesPhone = g.phone.includes(filterQuery.phone);
    return matchesName && matchesPhone;
  });

  const handleDelete = (id) => {
    setGuests(guests.filter((g) => g.id !== id));
    toast.success("Guest record deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Guest Detail
          </h2>
          <p className="text-xs text-zinc-400">
            Search guest contact information and view dining history.
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
              Type Guest Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Alexander"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
              Call Number
            </label>
            <Input
              type="text"
              placeholder="e.g. 604"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
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

      {/* Guest Table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Guest List Accounts
        </h3>

        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">Guest Name</th>
                <th className="p-4 font-black text-center w-40">Order History</th>
                <th className="p-4 font-black text-center w-52">Email</th>
                <th className="p-4 font-black text-center w-40">Call</th>
                <th className="p-4 font-black text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400 font-bold uppercase tracking-wider">
                    No guest record found matching filters.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-zinc-50">
                    <td className="p-4 font-bold text-zinc-900">{g.name}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => toast.success(`Downloading order history PDF for ${g.name}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </td>
                    <td className="p-4 text-center text-zinc-450 font-bold">{g.email}</td>
                    <td className="p-4 text-center font-extrabold text-[#F97316]">{g.phone}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(g.id)}
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
