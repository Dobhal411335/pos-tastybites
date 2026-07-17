"use client";

import React, { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function MenuCategoriesPage() {
  const [categories, setCategories] = useState([
    { id: 1, name: "Starters & Appetizers", active: true },
    { id: 2, name: "Gourmet Hamburgers", active: true },
    { id: 3, name: "Wood-Fired Pizzas", active: true },
    { id: 4, name: "Seasonal Desserts", active: true },
    { id: 5, name: "Premium Cocktails & Drinks", active: false },
  ]);
  
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }
    
    const newCat = {
      id: Date.now(),
      name: newCategoryName.trim(),
      active: true,
    };
    
    setCategories([...categories, newCat]);
    setNewCategoryName("");
    toast.success("Category created successfully!");
  };

  const handleToggleStatus = (id) => {
    setCategories(
      categories.map((cat) =>
        cat.id === id ? { ...cat, active: !cat.active } : cat
      )
    );
    toast.info("Category status updated.");
  };

  const handleDeleteCategory = (id) => {
    setCategories(categories.filter((cat) => cat.id !== id));
    toast.success("Category deleted successfully.");
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
          Create Menu Category
        </h2>
        <p className="text-xs text-zinc-400 font-light">
          Add or manage your restaurant menu sections
        </p>
      </div>

      {/* Create Category Form */}
      <form onSubmit={handleCreateCategory} className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Category Name
          </label>
          <Input
            type="text"
            placeholder="Type Here"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm"
          />
        </div>
        
        <Button
          type="submit"
          className="bg-[#F97316] hover:bg-[#e06510] text-white rounded-[10px] px-8 py-5 text-xs font-bold uppercase tracking-widest"
        >
          Create Menu
        </Button>
      </form>

      {/* Categories Table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Active Categories
        </h3>
        
        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">Menu Head Name</th>
                <th className="p-4 font-black text-center w-24">Edit</th>
                <th className="p-4 font-black text-center w-28">Status</th>
                <th className="p-4 font-black text-center w-24">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {categories.map((cat, index) => (
                <tr
                  key={cat.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-zinc-50"}
                >
                  <td className="p-4 font-bold text-zinc-900">{cat.name}</td>
                  
                  {/* Edit Action */}
                  <td className="p-4 text-center">
                    <button className="text-zinc-500 hover:text-blue-600 transition-colors p-1">
                      <Edit className="h-4 w-4 mx-auto" />
                    </button>
                  </td>

                  {/* Status Toggle */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-[9px] font-black uppercase tracking-wider transition-all ${
                        cat.active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {cat.active ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Delete Action */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
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
