"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, MoreHorizontal, LayoutList, Trash, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

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
    toast.success("Stock category created successfully.");
  };

  const handleDelete = (id) => {
    setCategories(categories.filter((c) => c.id !== id));
    toast.success("Category deleted successfully.");
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
                Stock Type Category
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Define main categories for your stock products.
              </p>
            </div>

          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-8">
              <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm">
                <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
                  <CardTitle className="text-lg font-semibold text-zinc-900">
                    Add New Category
                  </CardTitle>
                  <CardDescription>
                    Create a new organizational category for stock tracking.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-semibold text-zinc-900">
                        Stock Menu Head <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <LayoutList className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                        <Input
                          type="text"
                          placeholder="e.g. Beverages, Seafood, Packaging..."
                          value={menuHead}
                          onChange={(e) => setMenuHead(e.target.value)}
                          className="h-11 pl-10"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-11 px-8 font-semibold text-white lg:shrink-0"
                      style={{ backgroundColor: "#1e40af" }}
                    >
                      Create Category
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </form>

          {/* Overview Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200 flex flex-row items-center justify-between">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Categories Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Menu Head</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-zinc-500 text-[14px]">No categories found.</TableCell>
                    </TableRow>
                  ) : (
                    categories.map((c) => (
                      <TableRow key={c.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <Tag className="w-4 h-4 text-zinc-400" />
                            <span className="font-semibold text-[15px] text-zinc-900">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {c.status === "Active" ? (
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
                                <Edit className="mr-2 h-4 w-4" /> Edit Category
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => handleDelete(c.id)}
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
