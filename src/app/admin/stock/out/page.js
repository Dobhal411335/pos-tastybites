"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, Search, Eye, PlusCircle, PackageMinus, ClipboardList, TrendingDown, MoreHorizontal, Trash, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

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

  const handleSelectChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
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
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Stock Out
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Log outgoing stock and balance inventory.
              </p>
            </div>

          </div>

          <form onSubmit={handleCreate} className="flex flex-col items-center w-full gap-8">
            {/* Form Section */}
            <div className="space-y-6 w-full">

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#1e40af]" /> Product Selection
                  </CardTitle>
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

                      <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col justify-center relative overflow-hidden">
                        <TrendingDown className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-red-100 opacity-50" />
                        <span className="text-[12px] font-bold text-red-600 uppercase tracking-wider mb-1 relative z-10">Current Opening Balance</span>
                        <span className="text-[24px] font-bold text-red-900 relative z-10">${formData.openingBalance}</span>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <PackageMinus className="w-5 h-5 text-[#1e40af]" /> Stock Deduction
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">

                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <label className="text-[14px] font-semibold text-zinc-900">Date Out</label>
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
                      <PlusCircle className="w-4 h-4" /> Add Another Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Save Section */}
              <div className="flex flex-col justify-end">
                <Button
                  type="submit"
                  className="w-full h-14 text-[16px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: "#1e40af" }}
                >
                  Balance Stock
                </Button>
              </div>

            </div>
          </form>

          {/* Overview Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full max-w-sm">
                <Select value={searchMenuHead} onValueChange={setSearchMenuHead}>
                  <SelectTrigger className="w-full h-10 text-[14px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                    <SelectValue placeholder="Search Menu Head" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Produce">Produce</SelectItem>
                    <SelectItem value="Dairy">Dairy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-[13px] font-semibold text-zinc-500 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Current Date Status
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Product Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Stock</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Log</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Type</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Measure</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockOuts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-zinc-500 text-[14px]">No records found.</TableCell>
                    </TableRow>
                  ) : (
                    stockOuts.map((s) => (
                      <TableRow key={s.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <span className="font-semibold text-[15px] text-zinc-900">{s.name}</span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-zinc-100 text-zinc-700 px-3 py-1 rounded-md text-[14px] font-bold border border-zinc-200">
                            {s.stock}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <button type="button" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-[13px] font-semibold">
                            <Eye className="w-3.5 h-3.5" /> {s.log}
                          </button>
                        </TableCell>
                        <TableCell className="px-6 text-center text-[14px] font-semibold text-zinc-700">
                          {s.type}
                        </TableCell>
                        <TableCell className="px-6 text-center text-[13px] font-bold text-zinc-500 uppercase">
                          {s.measure}
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {s.status === "Active" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Inactive
                            </Badge>
                          )}
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
                                <Edit className="mr-2 h-4 w-4" /> Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => handleDelete(s.id)}
                              >
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
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
