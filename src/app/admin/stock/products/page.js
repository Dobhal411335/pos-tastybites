"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create Stock Product
          </h2>
          <p className="text-xs text-zinc-400">
            Define new stock inventory items and pricing.
          </p>
        </div>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To</span>
          </Button>
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleCreate} className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3 pt-3">
              Stock Menu Head
            </label>
            <div className="sm:w-2/3 space-y-1">
              <select
                name="menuHead"
                value={formData.menuHead}
                onChange={handleChange}
                className="w-full bg-[#1e40af] text-white border-none rounded-[4px] h-11 px-4 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-[#F97316]"
              >
                <option value="">SELECT HERE</option>
                <option value="Produce">Produce</option>
                <option value="Dairy">Dairy</option>
                <option value="Dry Goods">Dry Goods</option>
                <option value="Meat">Meat</option>
                <option value="Cleaning Supplies">Cleaning Supplies</option>
              </select>
              <p className="text-[9px] text-zinc-400 font-bold">Example : Produce, Dairy, Dry Goods, Meat, Cleaning Supplies</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Product Name
            </label>
            <Input
              type="text"
              name="productName"
              placeholder="Type Here"
              value={formData.productName}
              onChange={handleChange}
              className="bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] sm:w-2/3"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Product Type
            </label>
            <div className="sm:w-2/3 flex gap-2">
              <select
                name="productType"
                value={formData.productType}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white border-none rounded-[4px] h-11 px-4 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-[#F97316]"
              >
                <option value="">SELECT HERE</option>
                <option value="Solid">Solid</option>
                <option value="Liquid">Liquid</option>
                <option value="Raw">Raw</option>
              </select>
              <Button type="button" className="bg-[#1e40af] hover:bg-blue-900 text-white rounded-[4px] h-11 px-6 font-bold text-xs uppercase tracking-widest">
                + ADD
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Unit of Measure
            </label>
            <div className="sm:w-2/3 flex gap-2">
              <select
                name="unitOfMeasure"
                value={formData.unitOfMeasure}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white border-none rounded-[4px] h-11 px-4 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-[#F97316]"
              >
                <option value="">SELECT HERE</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="box">box</option>
              </select>
              <Button type="button" className="bg-[#1e40af] hover:bg-blue-900 text-white rounded-[4px] h-11 px-6 font-bold text-xs uppercase tracking-widest">
                + ADD
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3 leading-tight">
              Purchase Cost Price<br/><span className="text-[8px] text-zinc-400 font-medium">(LAST/AVERAGE)</span>
            </label>
            <div className="sm:w-2/3 flex items-center gap-2">
              <span className="font-bold text-lg">$</span>
              <Input
                type="text"
                name="purchaseAmount"
                placeholder="AMOUNT"
                value={formData.purchaseAmount}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-xs font-bold tracking-wider"
              />
              <Input
                type="text"
                name="purchaseValue"
                placeholder=". VALUE"
                value={formData.purchaseValue}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-xs font-bold tracking-wider"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest sm:w-1/3">
              Sale Cost Price
            </label>
            <div className="sm:w-2/3 flex items-center gap-2">
              <span className="font-bold text-lg">$</span>
              <Input
                type="text"
                name="saleAmount"
                placeholder="AMOUNT"
                value={formData.saleAmount}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-xs font-bold tracking-wider"
              />
              <Input
                type="text"
                name="saleValue"
                placeholder=". VALUE"
                value={formData.saleValue}
                onChange={handleChange}
                className="flex-1 bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-[4px] h-11 focus:ring-2 focus:ring-[#F97316] text-center uppercase text-xs font-bold tracking-wider"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#1e40af] hover:bg-blue-900 text-white rounded-[4px] h-12 font-bold text-sm uppercase tracking-widest mt-6"
        >
          Create Product
        </Button>
      </form>

      {/* Overview Table */}
      <div className="space-y-4 pt-8">
        <h3 className="text-sm font-extrabold text-zinc-900">
          Overview
        </h3>
        
        <div className="max-w-md">
          <Input
            type="text"
            placeholder="SEARCH MENU HEAD"
            value={searchMenuHead}
            onChange={(e) => setSearchMenuHead(e.target.value)}
            className="bg-[#1e40af] text-white placeholder:text-blue-200 border-none rounded-none rounded-t-[4px] h-11 focus:ring-2 focus:ring-[#F97316] uppercase text-xs font-bold"
          />
        </div>

        <div className="overflow-x-auto border border-[#ECECEC] rounded-[4px] rounded-tl-none overflow-hidden mt-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e40af] text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black border-r border-blue-900">Product Name</th>
                <th className="p-4 font-black text-center border-r border-blue-900">Create</th>
                <th className="p-4 font-black text-center w-32 border-r border-blue-900">Status</th>
                <th className="p-4 font-black text-center w-24">Delete <Edit className="h-3 w-3 inline ml-1" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-[#1e40af] text-xs text-white">
              {products.filter(p => p.menuHead.toLowerCase().includes(searchMenuHead.toLowerCase())).length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-blue-200 font-bold uppercase tracking-wider bg-white/5">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.filter(p => p.menuHead.toLowerCase().includes(searchMenuHead.toLowerCase())).map((p) => (
                  <tr key={p.id} className="hover:bg-blue-900 border-b border-blue-900">
                    <td className="p-4 font-bold border-r border-blue-900">{p.name}</td>
                    <td className="p-4 text-center border-r border-blue-900 text-blue-200 text-[10px]">{p.menuHead}</td>
                    <td className="p-4 text-center border-r border-blue-900">
                      {p.status}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-white hover:text-red-300 p-1"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
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
