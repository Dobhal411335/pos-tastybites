"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Download, Eye, Search, MoreHorizontal, Edit, Trash, ArrowUpDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

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
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Performance Status
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Identify top dining guests and food order volume metrics.
              </p>
            </div>

          </div>

          {/* Sort selection filter */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden max-w-2xl">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
              <CardTitle className="text-[18px] font-bold text-zinc-900">Food Order Volume</CardTitle>
              <CardDescription className="text-[14px]">Sort guests by their total number of orders.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-6 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <label className="text-[14px] font-semibold text-zinc-900 block">
                    Volume Order Selection
                  </label>
                  <div className="relative w-full">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />
                    <Select
                      value={sortOrder}
                      onValueChange={setSortOrder}
                    >
                      <SelectTrigger className="w-full h-11 pl-10 text-[15px] font-semibold border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                        <SelectValue placeholder="Select Sort Order" />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                        <SelectItem value="HIGHEST">HIGHEST TO LOWEST</SelectItem>
                        <SelectItem value="LOWEST">LOWEST TO HIGHEST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 px-6 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm w-full sm:w-auto flex items-center gap-2"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Performance audit table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Top Guest Volume Rankings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Maximum Order Guest</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Total Orders</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Order History</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPerformers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-zinc-500 text-[14px]">No ranking data available.</TableCell>
                    </TableRow>
                  ) : (
                    sortedPerformers.map((p) => (
                      <TableRow key={p.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
                              <User className="w-4 h-4 text-[#F97316]" />
                            </div>
                            <span className="font-semibold text-[15px] text-zinc-900">{p.name}</span>
                          </div>
                        </TableCell>

                        {/* Total Orders */}
                        <TableCell className="px-6 text-center">
                          <div className="inline-flex items-center justify-center bg-zinc-100 px-3 py-1 rounded-md text-[15px] font-bold text-zinc-800">
                            {p.totalOrders} <span className="text-[13px] text-zinc-500 ml-1 font-medium">Orders</span>
                          </div>
                        </TableCell>

                        {/* Download PDF */}
                        <TableCell className="px-6 text-center">
                          <button
                            type="button"
                            onClick={() => toast.success(`Downloading order history PDF for ${p.name}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-md text-[13px] font-semibold transition-all cursor-pointer"
                          >
                            <Download className="h-4 w-4 text-zinc-500" />
                            <span>Download PDF</span>
                          </button>
                        </TableCell>

                        <TableCell className="px-6 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white">
                              <DropdownMenuItem
                                className="text-[14px] font-medium cursor-pointer"
                                onClick={() => handleView(p.name, p.totalOrders)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => handleDelete(p.id)}
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
