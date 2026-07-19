"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Upload, MoreHorizontal, Image as ImageIcon, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ProductDetailsConfigPage() {
  // Mock products list for selection
  const [selectedProduct, setSelectedProduct] = useState("Spicy Garlic Shrimp");

  // Table lists
  const [productDetails, setProductDetails] = useState([
    { id: 1, name: "Spicy Garlic Shrimp", price: 18.99, size: "Regular", status: true },
    { id: 2, name: "Spicy Garlic Shrimp", price: 24.99, size: "Large Patty", status: true },
    { id: 3, name: "Classic Cheese Beef Burger", price: 14.50, size: "Regular", status: true },
  ]);

  const [addons, setAddons] = useState([
    { id: 1, name: "Extra Garlic Dip", price: 1.50, size: "N/A", status: true },
    { id: 2, name: "Avocado Slices", price: 2.99, size: "N/A", status: true },
  ]);

  // Form states
  const [prefix, setPrefix] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [selectedSize, setSelectedSize] = useState("Regular");
  const [selectedAddon, setSelectedAddon] = useState("Extra Dip");
  const [description, setDescription] = useState("");
  const [taxValue, setTaxValue] = useState("13");

  // Custom selection lists
  const [sizesList, setSizesList] = useState(["Regular", "Large Patty", "Double Option", "Family Size"]);
  const [addonsList, setAddonsList] = useState(["Extra Dip", "Avocado Slices", "Crispy Bacon Strips", "Extra Cheese Slice"]);

  // Custom Modal states
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);

  const [newSizeName, setNewSizeName] = useState("");
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonQty, setNewAddonQty] = useState("");
  const [newAddonAmount, setNewAddonAmount] = useState("");

  const handleAddSizeSubmit = (e) => {
    e.preventDefault();
    if (!newSizeName.trim()) {
      toast.error("Please enter a size name.");
      return;
    }
    setSizesList([...sizesList, newSizeName.trim()]);
    setSelectedSize(newSizeName.trim());
    setNewSizeName("");
    setIsSizeModalOpen(false);
    toast.success("Size created successfully!");
  };

  const handleAddAddonSubmit = (e) => {
    e.preventDefault();
    if (!newAddonName.trim() || !newAddonAmount || isNaN(parseFloat(newAddonAmount))) {
      toast.error("Please enter valid name and amount.");
      return;
    }
    setAddonsList([...addonsList, newAddonName.trim()]);
    setSelectedAddon(newAddonName.trim());

    const newAddonItem = {
      id: Date.now(),
      name: newAddonName.trim(),
      price: parseFloat(newAddonAmount),
      size: newAddonQty.trim() || "Regular",
      status: true,
    };
    setAddons([...addons, newAddonItem]);

    setNewAddonName("");
    setNewAddonQty("");
    setNewAddonAmount("");
    setIsAddonModalOpen(false);
    toast.success("Addon created and configured!");
  };

  const handleCreateDetail = (e) => {
    e.preventDefault();
    if (!priceAmount || isNaN(parseFloat(priceAmount))) {
      toast.error("Please enter a valid price amount.");
      return;
    }

    const newDetail = {
      id: Date.now(),
      name: selectedProduct,
      price: parseFloat(priceAmount),
      size: selectedSize,
      status: true,
    };

    setProductDetails([...productDetails, newDetail]);
    setPriceAmount("");
    toast.success("Product price configuration added!");
  };

  const handleToggleStatus = (id, list, setList) => {
    setList(
      list.map((item) =>
        item.id === id ? { ...item, status: !item.status } : item
      )
    );
    toast.info("Status toggled.");
  };

  const handleDeleteItem = (id, list, setList) => {
    setList(list.filter((item) => item.id !== id));
    toast.success("Item deleted.");
  };

  return (
    <div className="flex flex-col overflow-hidden" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />
      <div className="flex-1 flex overflow-hidden">

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1200px] mx-auto space-y-8">
            {/* Top Header & Back Button */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
              <div>
                <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                  Product Configuration
                </h1>
                <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                  Configure pricing, available sizes, addons, and tax overrides.
                </p>
              </div>
              <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 hover:bg-zinc-50 border-zinc-200 text-zinc-700">
                <Link href="/admin/menu/products">
                  <ArrowLeft className="w-5 h-5" />
                  Back To Products
                </Link>
              </Button>
            </div>

            <form onSubmit={handleCreateDetail} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Left Column (Main Form Fields) */}
              <div className="lg:col-span-8 space-y-6">

                {/* Basic Info Card */}
                <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="text-[18px] font-bold text-zinc-900">Basic Information</CardTitle>
                    <CardDescription className="text-[14px]">Select the product to configure and add a description.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[14px] font-semibold text-zinc-900">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                          <SelectTrigger className="h-11 text-[16px] bg-white">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="Spicy Garlic Shrimp">Spicy Garlic Shrimp</SelectItem>
                            <SelectItem value="Classic Cheese Beef Burger">Classic Cheese Beef Burger</SelectItem>
                            <SelectItem value="Bacon Truffle Burger">Bacon Truffle Burger</SelectItem>
                            <SelectItem value="Margherita Supreme Pizza">Margherita Supreme Pizza</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold text-zinc-900">
                          Prefix
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. New"
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value)}
                          className="h-11 text-[16px] bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Description
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Describe the product..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-auto bg-white border border-zinc-200 rounded-md p-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent transition-shadow"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing, Size, Addons Card */}
                <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="text-[18px] font-bold text-zinc-900">Pricing & Sizes</CardTitle>
                    <CardDescription className="text-[14px]">Configure pricing variations and link available addons.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold text-zinc-900">
                          Price Amount ($) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={priceAmount}
                          onChange={(e) => setPriceAmount(e.target.value)}
                          className="h-11 text-[16px] bg-white font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold text-zinc-900">
                          Size Option
                        </label>
                        <div className="flex gap-2">
                          <Select value={selectedSize} onValueChange={setSelectedSize}>
                            <SelectTrigger className="h-11 text-[16px] bg-white flex-1">
                              <SelectValue placeholder="Select Size" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {sizesList.map((sz, idx) => (
                                <SelectItem key={idx} value={sz}>{sz}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            onClick={() => setIsSizeModalOpen(true)}
                            variant="outline"
                            className="h-11 w-11 p-0 shrink-0 text-zinc-600 hover:text-zinc-900"
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <label className="text-[14px] font-semibold text-zinc-900 mt-4 block">
                        Link Addons
                      </label>
                      <div className="flex gap-2">
                        <Select value={selectedAddon} onValueChange={setSelectedAddon}>
                          <SelectTrigger className="h-11 text-[16px] bg-white flex-1">
                            <SelectValue placeholder="Select Addon" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {addonsList.map((ad, idx) => (
                              <SelectItem key={idx} value={ad}>{ad}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={() => setIsAddonModalOpen(true)}
                          variant="outline"
                          className="h-11 w-11 p-0 shrink-0 text-zinc-600 hover:text-zinc-900"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (Sidebar Settings) */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="text-[18px] font-bold text-zinc-900">Tax & Media</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        HST Tax (%)
                      </label>
                      <Input
                        type="number"
                        value={taxValue}
                        onChange={(e) => setTaxValue(e.target.value)}
                        className="h-11 text-[16px] bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Image
                      </label>
                      <button
                        type="button"
                        onClick={() => toast.success("Mock upload: image selected!")}
                        className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-lg h-32 hover:border-[#F97316] hover:bg-orange-50/50 transition-colors cursor-pointer group"
                      >
                        <div className="h-10 w-10 rounded-full bg-zinc-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                          <ImageIcon className="h-5 w-5 text-zinc-500 group-hover:text-[#F97316]" />
                        </div>
                        <span className="text-[13px] font-medium text-zinc-600 group-hover:text-zinc-900">Click to upload image</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  Save Configuration
                </Button>
              </div>
            </form>

            {/* Overview Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">

              {/* Table 1: Product Configs */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-zinc-200">
                  <CardTitle className="text-[16px] font-bold text-zinc-900">Active Configurations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 w-[40%]">Product / Size</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Price</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productDetails.length > 0 ? productDetails.map((det) => (
                        <TableRow key={det.id} className="h-16 hover:bg-zinc-50 transition-colors">
                          <TableCell className="px-6">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-semibold text-zinc-900">{det.name}</span>
                              <span className="text-[13px] text-zinc-500 mt-0.5">{det.size}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                            ${det.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(det.id, productDetails, setProductDetails)}
                              className="cursor-pointer transition-transform hover:scale-105"
                            >
                              {det.status ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-none px-2.5 py-1 text-[13px] font-semibold">
                                  Inactive
                                </Badge>
                              )}
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
                                <DropdownMenuItem className="text-[14px] font-medium cursor-pointer">
                                 <Edit/> Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                  onClick={() => handleDeleteItem(det.id, productDetails, setProductDetails)}
                                >
                                 <Trash/> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-zinc-500 text-[14px]">No configurations found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Table 2: Addons */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-zinc-200">
                  <CardTitle className="text-[16px] font-bold text-zinc-900">Active Addons</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 w-[40%]">Addon / Size</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Price</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addons.length > 0 ? addons.map((add) => (
                        <TableRow key={add.id} className="h-16 hover:bg-zinc-50 transition-colors">
                          <TableCell className="px-6">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-semibold text-zinc-900">{add.name}</span>
                              <span className="text-[13px] text-zinc-500 mt-0.5">{add.size}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                            ${add.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(add.id, addons, setAddons)}
                              className="cursor-pointer transition-transform hover:scale-105"
                            >
                              {add.status ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-none px-2.5 py-1 text-[13px] font-semibold">
                                  Inactive
                                </Badge>
                              )}
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
                                <DropdownMenuItem className="text-[14px] font-medium cursor-pointer">
                                  Edit Addons
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                  onClick={() => handleDeleteAddon(add.id, addons, setAddons)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-zinc-500 text-[14px]">No addons found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* 1. Create Size Modal */}
            <Dialog open={isSizeModalOpen} onOpenChange={setIsSizeModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddSizeSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-[22px] font-bold text-zinc-900">Create Size</DialogTitle>
                    <DialogDescription className="text-[15px]">
                      Add a new menu configuration size option.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Size Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        autoFocus
                        required
                        placeholder="e.g. Large Patty, Family Size"
                        className="h-11 text-[16px]"
                        value={newSizeName}
                        onChange={(e) => setNewSizeName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsSizeModalOpen(false)} className="h-11 px-6 font-semibold cursor-pointer">
                      Cancel
                    </Button>
                    <Button type="submit" className="h-11 px-6 font-semibold cursor-pointer text-white" style={{ backgroundColor: PALETTE.accent }}>
                      Save Size
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* 2. Create Addons Modal */}
            <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddAddonSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-[22px] font-bold text-zinc-900">Create Addon</DialogTitle>
                    <DialogDescription className="text-[15px]">
                      Configure a new supplementary product addon.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-6 space-y-5">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Addon Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        autoFocus
                        required
                        placeholder="e.g. Extra Bacon Strips"
                        className="h-11 text-[16px]"
                        value={newAddonName}
                        onChange={(e) => setNewAddonName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Quantity / Size
                      </label>
                      <Input
                        placeholder="e.g. 2 pieces (optional)"
                        className="h-11 text-[16px]"
                        value={newAddonQty}
                        onChange={(e) => setNewAddonQty(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Price Amount ($) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        className="h-11 text-[16px]"
                        value={newAddonAmount}
                        onChange={(e) => setNewAddonAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddonModalOpen(false)} className="h-11 px-6 font-semibold cursor-pointer">
                      Cancel
                    </Button>
                    <Button type="submit" className="h-11 px-6 font-semibold cursor-pointer text-white" style={{ backgroundColor: PALETTE.accent }}>
                      Save Addon
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
