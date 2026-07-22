"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle2, ArrowUpDown, MoreHorizontal, Tag, FolderTree, Package, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

import { Label } from "@/components/ui/label";
export default function ApplyDiscountsPage() {
  const [appliedDiscounts, setAppliedDiscounts] = useState([
    { id: 1, code: "TASTY15", targetType: "Category", targetName: "Gourmet Hamburgers", active: true },
    { id: 2, code: "WELCOME5", targetType: "Product", targetName: "Spicy Garlic Shrimp", active: true },
  ]);

  const [selectedCode, setSelectedCode] = useState("TASTY15");
  const [selectedMenuCategory, setSelectedMenuCategory] = useState("Gourmet Hamburgers");
  const [selectedProduct, setSelectedProduct] = useState("Spicy Garlic Shrimp");

  // Decide whether to apply to category or product
  const [targetMode, setTargetMode] = useState("Category"); // 'Category' or 'Product'

  const handleApplyCoupon = (e) => {
    e.preventDefault();

    const targetName = targetMode === "Category" ? selectedMenuCategory : selectedProduct;

    // Check duplication
    const duplicate = appliedDiscounts.some(
      (d) => d.code === selectedCode && d.targetType === targetMode && d.targetName === targetName
    );

    if (duplicate) {
      toast.error("This discount is already applied to this selection.");
      return;
    }

    const newApplication = {
      id: Date.now(),
      code: selectedCode,
      targetType: targetMode,
      targetName,
      active: true,
    };

    setAppliedDiscounts([...appliedDiscounts, newApplication]);
    toast.success(`Discount ${selectedCode} applied to ${targetName}!`);
  };

  const handleDeleteApplication = (id) => {
    setAppliedDiscounts(appliedDiscounts.filter((d) => d.id !== id));
    toast.success("Applied discount mapping removed.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Apply Coupon to Menu / Products
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Map active discount codes to entire menu categories or select standalone products.
              </p>
            </div>
          </div>

          <form onSubmit={handleApplyCoupon} className="grid grid-cols-1 gap-8">

            {/* Form Section */}
            <div className="space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Discount Target Selection</CardTitle>
                  <CardDescription className="text-[14px]">Select the coupon code and choose what it applies to.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Select Discount Offer Coupon Code */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Select Discount Offer Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />

                      <Select
                        value={selectedCode}
                        onValueChange={setSelectedCode}
                      >
                        <SelectTrigger className="w-full h-11 pl-10 text-[15px] font-mono font-semibold border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                          <SelectValue placeholder="Select Coupon Code" />
                        </SelectTrigger>

                        <SelectContent className="" style={{ backgroundColor: PALETTE.canvas }}>
                          <SelectItem value="TASTY15">
                            TASTY15 (15% OFF)
                          </SelectItem>

                          <SelectItem value="WELCOME5">
                            WELCOME5 ($5.00 OFF)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Target Mode */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-[14px] font-semibold text-zinc-900">
                      Apply Target Selection
                    </Label>

                    <RadioGroup
                      value={targetMode}
                      onValueChange={setTargetMode}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="category"
                        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${targetMode === "Category"
                          ? "border-[#F97316] bg-orange-50"
                          : "border-zinc-200 hover:border-zinc-300"
                          }`}
                      >
                        <RadioGroupItem value="Category" id="category" />

                        <FolderTree
                          className={`h-6 w-6 ${targetMode === "Category"
                            ? "text-[#F97316]"
                            : "text-zinc-400"
                            }`}
                        />

                        <div>
                          <p className="font-semibold text-sm">
                            Menu Category
                          </p>

                          <p className="text-xs text-zinc-500">
                            Apply coupon to a category
                          </p>
                        </div>
                      </Label>

                      <Label
                        htmlFor="product"
                        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${targetMode === "Product"
                          ? "border-[#F97316] bg-orange-50"
                          : "border-zinc-200 hover:border-zinc-300"
                          }`}
                      >
                        <RadioGroupItem value="Product" id="product" />

                        <Package
                          className={`h-6 w-6 ${targetMode === "Product"
                            ? "text-[#F97316]"
                            : "text-zinc-400"
                            }`}
                        />

                        <div>
                          <p className="font-semibold text-sm">
                            Single Product
                          </p>

                          <p className="text-xs text-zinc-500">
                            Apply coupon to one product
                          </p>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  {/* Category selection */}
                  {targetMode === "Category" ? (
                    <div className="space-y-2">
                      <Label>Select Menu Category</Label>

                      <div className="relative">
                        <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />

                        <Select
                          value={selectedMenuCategory}
                          onValueChange={setSelectedMenuCategory}
                        >
                          <SelectTrigger className="h-11 pl-10 border-zinc-200">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>

                          <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                            <SelectItem value="Starters & Appetizers">
                              Starters & Appetizers
                            </SelectItem>

                            <SelectItem value="Gourmet Hamburgers">
                              Gourmet Hamburgers
                            </SelectItem>

                            <SelectItem value="Wood-Fired Pizzas">
                              Wood-Fired Pizzas
                            </SelectItem>

                            <SelectItem value="Seasonal Desserts">
                              Seasonal Desserts
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    /* Product selection */
                    <div className="space-y-2">
                      <Label>Select Product</Label>

                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />

                        <Select
                          value={selectedProduct}
                          onValueChange={setSelectedProduct}
                        >
                          <SelectTrigger className="h-11 pl-10 border-zinc-200">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>

                          <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                            <SelectItem value="Spicy Garlic Shrimp">
                              Spicy Garlic Shrimp
                            </SelectItem>

                            <SelectItem value="Classic Cheese Beef Burger">
                              Classic Cheese Beef Burger
                            </SelectItem>

                            <SelectItem value="Bacon Truffle Burger">
                              Bacon Truffle Burger
                            </SelectItem>

                            <SelectItem value="Margherita Supreme Pizza">
                              Margherita Supreme Pizza
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>

            {/* Sidebar Save Section */}
            <div className="flex flex-col justify-end">
              <Button
                type="submit"
                className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                style={{ backgroundColor: PALETTE.accent }}
              >
                Apply Coupon Target
              </Button>
            </div>

          </form>

          {/* Applied discounts table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Active Coupon Mappings Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                        <span>Promotion Code</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Apply On (Type)</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Target Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appliedDiscounts.length > 0 ? appliedDiscounts.map((ad) => (
                    <TableRow key={ad.id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-zinc-400" />
                          <span className="font-mono font-bold text-[15px] text-zinc-900 tracking-wide">{ad.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge variant="outline" className="bg-zinc-50 text-zinc-600 border-zinc-200 font-semibold px-2.5 py-1 text-[13px]">
                          {ad.targetType}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6">
                        <span className="font-semibold text-[15px] text-zinc-800">{ad.targetName}</span>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </Badge>
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
                              <Edit /> Edit Discount
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteApplication(ad.id)}
                            >
                              <Trash />  Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-zinc-500 text-[14px]">No coupon mappings found.</TableCell>
                    </TableRow>
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
