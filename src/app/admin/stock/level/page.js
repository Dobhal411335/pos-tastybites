"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, Search, MoreHorizontal, Trash, CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { useRouter } from "next/navigation";

export default function StockLevelPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [searchMenuHead, setSearchMenuHead] = useState("all");
  const [stockLevels, setStockLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/stock/category");
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch (error) {
      console.error("Failed to fetch categories");
    }
  };
  const fetchStockLevels = async (categoryFilter) => {
    try {
      setLoading(true);
      const url = new URL("/api/stock/level", window.location.origin);
      if (categoryFilter && categoryFilter !== "all") {
        url.searchParams.append("category", categoryFilter);
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setStockLevels(json.data);
    } catch (error) {
      toast.error("Failed to load stock levels");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchStockLevels(searchMenuHead);
  }, [searchMenuHead]);



  const handleEditRedirect = (id) => {
    // Redirect to the products page so they can edit the product definition
    router.push(`/admin/stock/products?edit=${id}`);
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
                Current Stock Level
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                View real-time total inventory balances and filter by category.
              </p>
            </div>
          </div>

          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full max-w-sm">
                <Select value={searchMenuHead} onValueChange={setSearchMenuHead}>
                  <SelectTrigger className="w-full h-10 text-[14px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                    <SelectValue placeholder="Search Menu Head" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-[13px] font-semibold text-zinc-500 flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  onClick={() => fetchStockLevels(searchMenuHead)}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  Live Status
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Product Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">In - Out</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Current Balance</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Measure</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Pricing</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                      </TableCell>
                    </TableRow>
                  ) : stockLevels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-zinc-500 text-[14px]">No inventory records found.</TableCell>
                    </TableRow>
                  ) : (
                    stockLevels.map((s) => (
                      <TableRow key={s._id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[15px] text-zinc-900">{s.name}</span>
                            <span className="text-[12px] font-medium text-zinc-500">{s.category?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center font-mono text-[14px] text-zinc-900 font-semibold">
                          {s.totalIn} - {s.totalOut}
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-[15px] font-extrabold border border-blue-100">
                            {s.currentBalance}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center text-[14px] font-bold text-zinc-500 uppercase">
                          {s.unit?.name}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <span className="text-[13px] font-bold text-zinc-900">CP: ${s.purchasePrice?.toFixed(2)}</span>
                            <span className="text-[13px] font-bold text-emerald-600">SP: ${s.salePrice?.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {s.status ? (
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
                              <DropdownMenuItem 
                                className="text-[14px] font-medium cursor-pointer"
                                onSelect={() => handleEditRedirect(s._id)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Product
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
