"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function CreateTablePage() {
  const [tableNumber, setTableNumber] = useState("");
  const [tables, setTables] = useState([
    { id: 1, tableNumber: "Table 1", status: "Active" },
    { id: 2, tableNumber: "Table 2", status: "Active" },
    { id: 3, tableNumber: "Table 3", status: "Inactive" },
  ]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;
    setTables([...tables, { id: Date.now(), tableNumber: tableNumber.trim(), status: "Active" }]);
    setTableNumber("");
    toast.success("Table created successfully.");
  };

  const handleDelete = (id) => {
    setTables(tables.filter((t) => t.id !== id));
    toast.success("Table deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5 bg-[#EAB308] p-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">
          Create Diner Table
        </h2>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To</span>
          </Button>
        </Link>
      </div>

      {/* Form Section */}
      <div className="space-y-4 max-w-xl mx-auto pt-4">
        <h3 className="text-lg font-bold text-zinc-900">
          Create Table Number
        </h3>
        
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
          <Input
            type="text"
            placeholder="Type Here"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="flex-1 bg-white border-2 border-zinc-800 rounded-full h-14 px-8 text-center text-sm font-bold placeholder:text-zinc-400 focus:ring-0 focus:border-black"
          />
          <Button
            type="submit"
            className="flex-1 bg-white hover:bg-zinc-100 text-zinc-900 border-2 border-zinc-800 rounded-full h-14 px-8 font-bold text-lg"
          >
            Create
          </Button>
        </form>
      </div>

      <hr className="border-t-2 border-zinc-800 mt-12 mb-8" />

      {/* Overview Table */}
      <div className="space-y-4">
        <h3 className="text-md font-extrabold text-zinc-900">
          Data Overview
        </h3>

        <div className="overflow-x-auto border border-[#ECECEC] rounded-none overflow-hidden max-w-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0047AB] text-white uppercase text-[10px] tracking-widest font-black">
                <th className="p-4 font-black border-r border-blue-900 w-16 text-center">
                  <div className="flex justify-center items-center gap-1">
                    <div className="h-1 w-1 bg-white rounded-full"></div>
                    <div className="h-1 w-1 bg-white rounded-full"></div>
                    <div className="h-1 w-1 bg-white rounded-full"></div>
                  </div>
                </th>
                <th className="p-4 font-black border-r border-blue-900">Table Number</th>
                <th className="p-4 font-black text-center border-r border-blue-900 w-32">Status</th>
                <th className="p-4 font-black text-center w-24">Delete <Edit className="h-4 w-4 inline ml-1 bg-white text-black p-0.5 rounded-sm" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800 font-bold">
              {tables.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-400 font-bold uppercase tracking-wider">
                    No tables found.
                  </td>
                </tr>
              ) : (
                tables.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 border-b border-zinc-200">
                    <td className="p-4 border-r border-zinc-200"></td>
                    <td className="p-4 border-r border-zinc-200 uppercase tracking-widest text-[#0047AB]">{t.tableNumber}</td>
                    <td className="p-4 text-center border-r border-zinc-200 text-[#0047AB]">{t.status}</td>
                    <td className="p-4 text-center text-zinc-400 hover:text-red-500 cursor-pointer transition-colors" onClick={() => handleDelete(t.id)}>
                      {/* Empty block to match the visual of the form without an icon on every row if desired, but we'll put a trash icon for UX */}
                      <Trash2 className="h-4 w-4 mx-auto" />
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
