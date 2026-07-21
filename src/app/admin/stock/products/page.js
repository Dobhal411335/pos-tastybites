"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, Search, PlusCircle, PackageSearch, Tag, MoreHorizontal, Trash, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast , Toaster} from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function StockProductsPage() {
  const [products, setProducts] = useState([
    { id: 1, name: "Tomato", menuHead: "Produce", status: "Active" },
    { id: 2, name: "Milk", menuHead: "Dairy", status: "Active" },
    { id: 3, name: "Flour", menuHead: "Dry Goods", status: "Active" },
  ]);

  const [formData, setFormData] = useState({
    menuHead: "",
    productName: "",
    productType: "",
    unitOfMeasure: "",
    purchaseAmount: "",
    purchaseValue: "",
    saleAmount: "",
    saleValue: "",
  });

  const [searchMenuHead, setSearchMenuHead] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!formData.productName.trim() || !formData.menuHead) return;
    setProducts([...products, { id: Date.now(), name: formData.productName, menuHead: formData.menuHead, status: "Active" }]);
    setFormData({
      menuHead: "", productName: "", productType: "", unitOfMeasure: "", purchaseAmount: "", purchaseValue: "", saleAmount: "", saleValue: ""
    });
    toast.success("Stock product created successfully.");
  };

  const handleDelete = (id) => {
    setProducts(products.filter((p) => p.id !== id));
    toast.success("Product deleted successfully.");
  };

  const filteredProducts = products.filter(p => searchMenuHead === "all" || searchMenuHead === "" ? true : p.menuHead.toLowerCase().includes(searchMenuHead.toLowerCase()));

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Stock Product
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Define new stock inventory items, categorization, and pricing.
              </p>
            </div>

          </div>

          <form onSubmit={handleCreate} className="flex flex-col w-full gap-8 mx-auto">

            {/* Form Section */}
            <div className="space-y-6">

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <PackageSearch className="w-5 h-5 text-[#1e40af]" /> Product Details
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
                          <SelectItem value="Dry Goods">Dry Goods</SelectItem>
                          <SelectItem value="Meat">Meat</SelectItem>
                          <SelectItem value="Cleaning Supplies">Cleaning Supplies</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        name="productName"
                        placeholder="e.g. Tomato, Milk, Flour..."
                        value={formData.productName}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Type
                      </label>
                      <div className="flex gap-2">
                        <Select value={formData.productType} onValueChange={(val) => handleSelectChange("productType", val)}>
                          <SelectTrigger className="flex-1 h-11 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                            <SelectItem value="Solid">Solid</SelectItem>
                            <SelectItem value="Liquid">Liquid</SelectItem>
                            <SelectItem value="Raw">Raw</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" className="h-11 px-3 border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Unit of Measure
                      </label>
                      <div className="flex gap-2">
                        <Select value={formData.unitOfMeasure} onValueChange={(val) => handleSelectChange("unitOfMeasure", val)}>
                          <SelectTrigger className="flex-1 h-11 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                            <SelectValue placeholder="Select Measure" />
                          </SelectTrigger>
                          <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="box">box</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" className="h-11 px-3 border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#1e40af]" /> Pricing Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Purchase Pricing */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[14px] font-semibold text-zinc-900">Purchase Cost Price</label>
                        <p className="text-[12px] text-zinc-500 font-medium">Last or average purchase price.</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                          <Input
                            type="text"
                            name="purchaseAmount"
                            placeholder="Amount"
                            value={formData.purchaseAmount}
                            onChange={handleChange}
                            className="h-11 pl-8 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                          />
                        </div>
                        <Input
                          type="text"
                          name="purchaseValue"
                          placeholder=".Value"
                          value={formData.purchaseValue}
                          onChange={handleChange}
                          className="w-24 h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                        />
                      </div>
                    </div>

                    {/* Sale Pricing */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[14px] font-semibold text-zinc-900">Sale Cost Price</label>
                        <p className="text-[12px] text-zinc-500 font-medium">Standard selling price configuration.</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                          <Input
                            type="text"
                            name="saleAmount"
                            placeholder="Amount"
                            value={formData.saleAmount}
                            onChange={handleChange}
                            className="h-11 pl-8 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                          />
                        </div>
                        <Input
                          type="text"
                          name="saleValue"
                          placeholder=".Value"
                          value={formData.saleValue}
                          onChange={handleChange}
                          className="w-24 h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                        />
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>

            </div>

            {/* Sidebar Save Section */}
            <div className="w-full justify-center flex">
              <Button
                type="submit"
                className="w-full h-14 text-[16px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                style={{ backgroundColor: "#1e40af" }}
              >
                Create Product
              </Button>
            </div>

          </form>

          {/* Overview Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Product Inventory List</CardTitle>
              <div className="w-full max-w-sm">
                <Select value={searchMenuHead} onValueChange={setSearchMenuHead}>
                  <SelectTrigger className="w-full h-10 text-[14px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                    <SelectValue placeholder="Search Menu Head" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Produce">Produce</SelectItem>
                    <SelectItem value="Dairy">Dairy</SelectItem>
                    <SelectItem value="Dry Goods">Dry Goods</SelectItem>
                    <SelectItem value="Meat">Meat</SelectItem>
                    <SelectItem value="Cleaning Supplies">Cleaning Supplies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Product Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Menu Category</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-zinc-500 text-[14px]">No products found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow key={p.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <Tag className="w-4 h-4 text-zinc-400" />
                            <span className="font-semibold text-[15px] text-zinc-900">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-zinc-100 text-zinc-600 px-3 py-1 rounded-md text-[13px] font-bold border border-zinc-200">
                            {p.menuHead}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {p.status === "Active" ? (
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
                                <Edit className="mr-2 h-4 w-4" /> Edit Product
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
