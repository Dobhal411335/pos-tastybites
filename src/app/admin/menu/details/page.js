"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle2, XCircle, Upload, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [uploadedImage, setUploadedImage] = useState(null);

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

  const handleToggleStatus = (id) => {
    setProductDetails(
      productDetails.map((det) =>
        det.id === id ? { ...det, status: !det.status } : det
      )
    );
    toast.info("Status toggled.");
  };

  const handleDeleteDetail = (id) => {
    setProductDetails(productDetails.filter((d) => d.id !== id));
    toast.success("Configuration deleted.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create Product Price / Size / Tax Detail
          </h2>
          <p className="text-xs text-zinc-400">
            Configure pricing, available sizes, addons, and tax overrides.
          </p>
        </div>
        <Link href="/admin/menu/products">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Products</span>
          </Button>
        </Link>
      </div>

      {/* Main Forms Section */}
      <form onSubmit={handleCreateDetail} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200">
        
        {/* Left Column */}
        <div className="space-y-5">
          {/* Select Product */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Product Name (Prefix optional)
            </label>
            <div className="flex gap-2">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="flex-1 bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
              >
                <option value="Spicy Garlic Shrimp">Spicy Garlic Shrimp</option>
                <option value="Classic Cheese Beef Burger">Classic Cheese Beef Burger</option>
                <option value="Bacon Truffle Burger">Bacon Truffle Burger</option>
                <option value="Margherita Supreme Pizza">Margherita Supreme Pizza</option>
              </select>
              <Input
                type="text"
                placeholder="Pre Fix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-24 bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
              />
            </div>
          </div>

          {/* Price & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                Price Amount ($)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Amount / Value"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                Size
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="flex-1 bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
                >
                  {sizesList.map((sz, idx) => (
                    <option key={idx} value={sz}>{sz}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={() => setIsSizeModalOpen(true)}
                  variant="outline"
                  className="h-11 w-11 p-0 rounded-[10px]"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Addons Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Addons Choice
            </label>
            <div className="flex gap-2">
              <select
                value={selectedAddon}
                onChange={(e) => setSelectedAddon(e.target.value)}
                className="flex-1 bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
              >
                {addonsList.map((ad, idx) => (
                  <option key={idx} value={ad}>{ad}</option>
                ))}
              </select>
              <Button
                type="button"
                onClick={() => setIsAddonModalOpen(true)}
                variant="outline"
                className="h-11 w-11 p-0 rounded-[10px] shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5 flex flex-col justify-between">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Product Description
            </label>
            <textarea
              rows={4}
              placeholder="Product Description Here"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-[10px] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
            />
          </div>

          {/* Tax & Image Upload */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 w-1/3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                HST Tax (%)
              </label>
              <Input
                type="number"
                value={taxValue}
                onChange={(e) => setTaxValue(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
              />
            </div>
            
            <button
              type="button"
              onClick={() => toast.success("Mock upload: image saved!")}
              className="flex-1 bg-yellow-950 text-white rounded-[10px] h-11 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Product Image</span>
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#12A594] hover:bg-[#0f8b7b] text-white rounded-[10px] py-6 text-xs uppercase tracking-widest font-black"
          >
            Create Product Config
          </Button>
        </div>

      </form>

      {/* Overview Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Table 1: Product Detail Over View */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
            Product Detail Over View
          </h3>
          <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                  <th className="p-4 font-black">Product Name</th>
                  <th className="p-4 font-black text-center w-24">Price</th>
                  <th className="p-4 font-black text-center w-24">Size</th>
                  <th className="p-4 font-black text-center w-28">Status</th>
                  <th className="p-4 font-black text-center w-20">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
                {productDetails.map((det) => (
                  <tr key={det.id} className="hover:bg-zinc-50">
                    <td className="p-4 font-bold text-zinc-900">{det.name}</td>
                    <td className="p-4 text-center font-extrabold text-[#F97316]">${det.price.toFixed(2)}</td>
                    <td className="p-4 text-center text-zinc-500 font-bold">{det.size}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(det.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          det.status ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {det.status ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteDetail(det.id)}
                        className="text-zinc-400 hover:text-red-550 p-1"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Addons Product Here */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
            Addons Product Here
          </h3>
          <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                  <th className="p-4 font-black">Addons Name</th>
                  <th className="p-4 font-black text-center w-24">Price</th>
                  <th className="p-4 font-black text-center w-24">Size</th>
                  <th className="p-4 font-black text-center w-28">Status</th>
                  <th className="p-4 font-black text-center w-20">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
                {addons.map((add) => (
                  <tr key={add.id} className="hover:bg-zinc-50">
                    <td className="p-4 font-bold text-zinc-900">{add.name}</td>
                    <td className="p-4 text-center font-extrabold text-[#F97316]">${add.price.toFixed(2)}</td>
                    <td className="p-4 text-center text-zinc-400 font-bold">{add.size}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="text-zinc-400 hover:text-red-550 p-1">
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 1. Create Size Modal */}
      {isSizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6 shadow-xl border border-zinc-200 flex flex-col gap-5">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsSizeModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 text-zinc-400 hover:text-zinc-650 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-900">
                Create Size
              </h3>
              <p className="text-xs text-zinc-555">
                Add a new menu configuration size option
              </p>
            </div>

            <form onSubmit={handleAddSizeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
                  Size Name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Large Patty, Family Size"
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#F97316] hover:bg-[#e06510] text-white font-bold py-5 rounded-[10px] text-xs uppercase tracking-widest"
              >
                Submit
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Addons Modal */}
      {isAddonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-[16px] p-6 shadow-xl border border-zinc-200 flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setIsAddonModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 text-zinc-400 hover:text-zinc-650 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-900">
                Create Addons
              </h3>
              <p className="text-xs text-zinc-555">
                Configure a new supplementary product addon
              </p>
            </div>

            <form onSubmit={handleAddAddonSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest block">
                  Addon Name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Extra Bacon Strips"
                  value={newAddonName}
                  onChange={(e) => setNewAddonName(e.target.value)}
                  className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest block">
                  Quantity / Size
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 2 pieces"
                  value={newAddonQty}
                  onChange={(e) => setNewAddonQty(e.target.value)}
                  className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest block">
                  Amount ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2.50"
                  value={newAddonAmount}
                  onChange={(e) => setNewAddonAmount(e.target.value)}
                  className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#F97316] hover:bg-[#e06510] text-white font-bold py-5 rounded-[10px] text-xs uppercase tracking-widest"
              >
                Submit
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
