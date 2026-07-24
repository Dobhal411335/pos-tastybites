"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, MoreHorizontal, LayoutList, Trash, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function StockCategoryPage() {
  const [categories, setCategories] = useState([]);
  const [menuHead, setMenuHead] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete Dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/stock/category");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!menuHead.trim()) {
      toast.error("Category name is required");
      return;
    }
    
    setSaving(true);
    
    try {
      const url = editingId ? `/api/stock/category/${editingId}` : "/api/stock/category";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: menuHead.trim() })
      });
      
      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "Category updated successfully" : "Stock category created successfully.");
        setMenuHead("");
        setEditingId(null);
        fetchCategories();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setMenuHead(category.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setMenuHead("");
  };

  const openDeleteDialog = (id) => {
    setItemToDelete(id);
    // Use a small timeout to let the DropdownMenu finish its cleanup animation
    // This prevents the page from being frozen with pointer-events: none
    setTimeout(() => {
      setDeleteOpen(true);
    }, 100);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`/api/stock/category/${itemToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Category deleted successfully.");
        fetchCategories();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to delete category");
    } finally {
      setDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />
      
      <DeleteDialog 
        isOpen={deleteOpen}
        onOpenChange={(open) => setDeleteOpen(open)}
        onConfirm={confirmDelete}
        title="Delete Category"
        description="Are you sure you want to delete this stock category? This action cannot be undone."
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

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

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-8">
              <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm">
                <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
                  <CardTitle className="text-lg font-semibold text-zinc-900">
                    {editingId ? "Edit Category" : "Add New Category"}
                  </CardTitle>
                  <CardDescription>
                    {editingId ? "Update existing category details." : "Create a new organizational category for stock tracking."}
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

                    <div className="flex gap-2 lg:shrink-0">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="h-11 px-8 font-semibold text-white"
                        style={{ backgroundColor: "#1e40af" }}
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {editingId ? "Update Category" : "Create Category"}
                      </Button>
                      
                      {editingId && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-11 px-4 font-semibold"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-zinc-500 text-[14px]">No categories found.</TableCell>
                    </TableRow>
                  ) : (
                    categories.map((c) => (
                      <TableRow key={c._id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <Tag className="w-4 h-4 text-zinc-400" />
                            <span className="font-semibold text-[15px] text-zinc-900">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {c.status ? (
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
                                onSelect={() => handleEdit(c)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Category
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onSelect={() => openDeleteDialog(c._id)}
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
