"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutGrid,
  Edit,
  Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";
import { Loader2 } from "lucide-react";

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchInitialData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/menu/products"),
        fetch("/api/menu/categories")
      ]);
      const prodJson = await prodRes.json();
      const catJson = await catRes.json();

      if (prodJson.success) setProducts(prodJson.data);
      if (catJson.success) setCategories(catJson.data);
    } catch (e) {
      toast.error("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      return toast.error("Please enter a product name.");
    }
    if (!selectedCategory) {
      return toast.error("Please select a category.");
    }

    try {
      const res = await fetch("/api/menu/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProductName.trim(),
          categoryId: selectedCategory
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Product draft created! Redirecting to configuration...");
        router.push(`/admin/menu/products/${json.data._id}`);
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleToggleStatus = async (prod) => {
    const newStatus = prod.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/menu/products/${prod._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Status updated to ${newStatus}`);
        setProducts(products.map(p => p._id === prod._id ? { ...p, status: newStatus } : p));
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleDeletePrompt = (id) => {
    setProductToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/menu/products/${productToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Product deleted successfully.");
        fetchInitialData();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const term = searchQuery.toLowerCase();
    const catName = p.category?.name?.toLowerCase() || "";
    return p.name.toLowerCase().includes(term) || catName.includes(term);
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-300 mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                  Menu Products
                </h1>
                <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                  Manage individual menu items, prices, and assignments to categories.
                </p>
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 px-4 font-semibold text-[15px] gap-2 transition-transform hover:scale-[1.02]" style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                    <Plus className="w-5 h-5" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleCreateProduct}>
                    <DialogHeader>
                      <DialogTitle className="text-[22px] font-bold">Add Product</DialogTitle>
                      <DialogDescription className="text-[15px]">
                        Create a new product draft. You can configure prices and modifiers later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-5">
                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold" style={{ color: PALETTE.ink }}>
                          Category <span className="text-red-500">*</span>
                        </label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="h-11 text-[16px]">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {categories.map(c => (
                              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold" style={{ color: PALETTE.ink }}>
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          autoFocus
                          placeholder="e.g. Classic Cheese Beef Burger"
                          className="h-11 text-[16px]"
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-11 px-6 font-semibold cursor-pointer">
                        Cancel
                      </Button>
                      <Button type="submit" className="h-11 px-6 font-semibold cursor-pointer" style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                        Create Draft
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Table Card */}
            <Card className="bg-white border-0 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${PALETTE.border}` }}>

              {/* Toolbar */}
              <CardHeader className="px-6 py-5 border-b" style={{ borderColor: PALETTE.border, paddingBottom: "1.25rem" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Search products..."
                      className="h-10 pl-9 bg-zinc-50 border-zinc-200 text-[14px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>

              {/* Table */}
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-zinc-50 sticky top-0 z-10 border-b border-zinc-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[50%] text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                        Product / Category <ArrowUpDown className="inline w-3 h-3 ml-1" />
                      </TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => (
                        <TableRow key={p._id} className="h-16 hover:bg-zinc-50 transition-colors">
                          <TableCell className="px-6 py-3">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-semibold text-zinc-900 leading-tight">
                                {p.name}
                              </span>
                              <span className="text-[13px] text-zinc-500 mt-1">
                                {p.category?.name || "Uncategorized"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6">
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleToggleStatus(p)}>
                              {p.status === "Active" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[13px] font-semibold transition-colors cursor-pointer">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 px-2.5 py-1 text-[13px] font-semibold transition-colors cursor-pointer">
                                  Inactive
                                </Badge>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" className="h-8 text-[12px] font-semibold" asChild>
                                <Link href={`/admin/menu/products/${p._id}`}>Edit Product</Link>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 bg-white">
                                  <DropdownMenuItem asChild className="text-[14px] font-medium cursor-pointer">
                                    <Link href={`/admin/menu/products/${p._id}`}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                    onClick={() => { setTimeout(() => handleDeletePrompt(p._id), 150) }}
                                  >
                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-zinc-500 text-[15px]">
                          No products found matching &quot;{searchQuery}&quot;
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Pagination */}
              <CardFooter className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <span className="text-[14px] text-zinc-500 font-medium">
                  Showing {filteredProducts.length} of {products.length} products
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 text-zinc-400" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-zinc-400" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>

          </div>
        </main>
      </div>

      <DeleteDialog 
        isOpen={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        onConfirm={confirmDelete} 
        title="Delete Product" 
        description="Are you sure you want to delete this product? This action cannot be undone." 
      />
    </div>
  );
}
