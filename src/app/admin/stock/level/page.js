"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, Search, MoreHorizontal, Trash, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast , Toaster} from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

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
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Current Stock Level
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                View total inventory balances and filter by category.
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
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">High Value<br />(In - Out)</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Current Balance</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Measure</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLevels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-zinc-500 text-[14px]">No records found.</TableCell>
                    </TableRow>
                  ) : (
                    stockLevels.map((s) => (
                      <TableRow key={s.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <span className="font-semibold text-[15px] text-zinc-900">{s.name}</span>
                        </TableCell>
                        <TableCell className="px-6 text-center font-mono text-[14px] text-zinc-600">
                          {s.highValue}
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-[15px] font-extrabold border border-blue-100">
                            {s.currentBalance}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center text-[14px] font-bold text-zinc-500 uppercase">
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
