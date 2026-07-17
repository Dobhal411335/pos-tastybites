"use client";

import React, { useState } from "react";
import { Edit, Trash2, Plus, ArrowUpDown, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateProductPage() {
  const [products, setProducts] = useState([
    { id: 1, category: "Starters & Appetizers", name: "Spicy Garlic Shrimp" },
    { id: 2, category: "Gourmet Hamburgers", name: "Classic Cheese Beef Burger" },
    { id: 3, category: "Gourmet Hamburgers", name: "Bacon Truffle Burger" },
    { id: 4, category: "Wood-Fired Pizzas", name: "Margherita Supreme Pizza" },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("Starters & Appetizers");
  const [newProductName, setNewProductName] = useState("");

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      toast.error("Please enter a product name.");
      return;
    }

    const newProd = {
      id: Date.now(),
      category: selectedCategory,
      name: newProductName.trim(),
    };

    setProducts([...products, newProd]);
    setNewProductName("");
    toast.success("Product draft created! Head to Product Details to configure price and addons.");
  };

  const handleDeleteProduct = (id) => {
    setProducts(products.filter((p) => p.id !== id));
    toast.success("Product deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
          Create Product
        </h2>
        <p className="text-xs text-zinc-400">
          Create standard product entities linked to menu categories
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleCreateProduct} className="space-y-5 max-w-lg">
        {/* Select Menu Category */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Select Menu Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-[10px] h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
          >
            <option value="Starters & Appetizers">Starters & Appetizers</option>
            <option value="Gourmet Hamburgers">Gourmet Hamburgers</option>
            <option value="Wood-Fired Pizzas">Wood-Fired Pizzas</option>
            <option value="Seasonal Desserts">Seasonal Desserts</option>
          </select>
        </div>

        {/* Product Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Product Name
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Product Name Type Here"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-[10px] px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-1 border-zinc-200 text-zinc-650 hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" />
              <span>Add More</span>
            </Button>
          </div>
        </div>

        {/* Action Button */}
        <Button
          type="submit"
          className="bg-[#F97316] hover:bg-[#e06510] text-white rounded-[10px] px-8 py-5 text-xs font-bold uppercase tracking-widest"
        >
          Create Product
        </Button>
      </form>

      {/* Product List Table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Active Product List
        </h3>
        
        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span>Menu Head Name / Product</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 font-black text-center w-24">Create</th>
                <th className="p-4 font-black text-center w-24">Edit</th>
                <th className="p-4 font-black text-center w-28">Status</th>
                <th className="p-4 font-black text-center w-24">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {products.map((p, index) => (
                <tr
                  key={p.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-zinc-50"}
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#F97316] uppercase tracking-wider">{p.category}</span>
                      <span className="text-sm font-bold text-zinc-900 mt-0.5">{p.name}</span>
                    </div>
                  </td>
                  
                  {/* Create Action */}
                  <td className="p-4 text-center">
                    <Link
                      href="/admin/menu/details"
                      className="text-xs font-extrabold uppercase text-[#12A594] hover:underline"
                    >
                      Configure
                    </Link>
                  </td>

                  {/* Edit Action */}
                  <td className="p-4 text-center">
                    <button className="text-zinc-500 hover:text-blue-600 transition-colors p-1">
                      <Edit className="h-4 w-4 mx-auto" />
                    </button>
                  </td>

                  {/* Status Toggle */}
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Active</span>
                    </span>
                  </td>

                  {/* Delete Action */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-1"
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
    </div>
  );
}
