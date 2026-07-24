"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, Search, Eye, PlusCircle, PackageMinus, ClipboardList, TrendingDown, MoreHorizontal, Trash, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";
import { DatePicker } from "@/components/ui/date-picker";

export default function StockOutPage() {
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [stockOuts, setStockOuts] = useState([]);
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete Dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({
    menuHead: "",
    productName: "",
    stockDate: new Date(),
    qty: "",
    value: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes, stockOutRes] = await Promise.all([
        fetch("/api/stock/category"),
        fetch("/api/stock/products"),
        fetch("/api/stock/out")
      ]);

      const [catJson, prodJson, stockOutJson] = await Promise.all([
        catRes.json(),
        prodRes.json(),
        stockOutRes.json()
      ]);

      if (catJson.success) setCategories(catJson.data);
      if (prodJson.success) setAllProducts(prodJson.data);
      if (stockOutJson.success) setStockOuts(stockOutJson.data);
    } catch (error) {
      toast.error("Failed to fetch initial data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStockOuts = async () => {
    try {
      const res = await fetch("/api/stock/out");
      const json = await res.json();
      if (json.success) setStockOuts(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Helper to calculate balance
  const calculateOpeningBalance = async (productId) => {
    if (!productId) return;
    try {
      const [inRes, outRes] = await Promise.all([
        fetch(`/api/stock/in?productId=${productId}`),
        fetch(`/api/stock/out?productId=${productId}`)
      ]);
      const [inJson, outJson] = await Promise.all([inRes.json(), outRes.json()]);

      let totalIn = 0;
      let totalOut = 0;

      if (inJson.success) {
        totalIn = inJson.data.reduce((sum, item) => sum + item.quantity, 0);
      }
      if (outJson.success) {
        totalOut = outJson.data.reduce((sum, item) => sum + item.quantity, 0);
      }

      const balance = totalIn - totalOut;
      setOpeningBalance(balance.toFixed(2));
    } catch (error) {
      console.error("Failed to calculate balance");
    }
  };

  const handleCategoryChange = (categoryId) => {
    setFormData((prev) => ({ ...prev, menuHead: categoryId, productName: "" }));
    setFilteredProducts(allProducts.filter(p => p.category?._id === categoryId));
    setSelectedProductDetails(null);
    setOpeningBalance("0.00");
  };

  const handleProductChange = (productId) => {
    setFormData((prev) => ({ ...prev, productName: productId }));
    const product = allProducts.find(p => p._id === productId);
    setSelectedProductDetails(product);
    calculateOpeningBalance(productId);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName || !formData.stockDate || !formData.qty || !formData.value) {
      toast.error("Product, Date, QTY, and Value are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/stock/out/${editingId}` : "/api/stock/out";
      const method = editingId ? "PUT" : "POST";

      const payload = {
        product: formData.productName,
        date: formData.stockDate.toISOString(),
        quantity: formData.qty,
        value: formData.value,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "Stock Out updated successfully" : "Stock Out entry created");
        handleCancelEdit();
        fetchStockOuts();
        calculateOpeningBalance(formData.productName);
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry._id);

    const catId = entry.product?.category?._id?.toString() || entry.product?.category?.toString();
    const prodId = entry.product?._id?.toString() || entry.product?.toString();

    // Set up category and filtered products first
    setFilteredProducts(allProducts.filter(p => {
      const pCat = p.category?._id?.toString() || p.category?.toString();
      return pCat === catId;
    }));

    setFormData({
      menuHead: catId || "",
      productName: prodId || "",
      stockDate: new Date(entry.date),
      qty: entry.quantity.toString(),
      value: entry.value.toString(),
    });

    const product = allProducts.find(p => p._id === entry.product?._id);
    setSelectedProductDetails(product);
    calculateOpeningBalance(entry.product?._id);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      menuHead: "",
      productName: "",
      stockDate: new Date(),
      qty: "",
      value: "",
    });
    setFilteredProducts([]);
    setSelectedProductDetails(null);
    setOpeningBalance("0.00");
  };

  const openDeleteDialog = (id) => {
    setItemToDelete(id);
    setTimeout(() => setDeleteOpen(true), 100);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`/api/stock/out/${itemToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Entry deleted successfully");
        fetchStockOuts();
        if (formData.productName) {
          calculateOpeningBalance(formData.productName);
        }
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to delete entry");
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
        title="Delete Stock Out Entry"
        description="Are you sure you want to delete this stock out entry? This will restore the inventory balance."
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Stock Out
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Log outgoing stock and balance inventory.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col items-center w-full gap-8">
            <div className="space-y-6 w-full">

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#1e40af]" /> Product Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Stock Menu Head <span className="text-red-500">*</span>
                      </label>
                      <Select value={formData.menuHead} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-60 overflow-y-auto">
                          {categories.map((c) => (
                            <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.productName}
                        onValueChange={handleProductChange}
                        disabled={!formData.menuHead}
                      >
                        <SelectTrigger className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                          <SelectValue placeholder={formData.menuHead ? "Select Product" : "Select Category first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-60 overflow-y-auto">
                          {filteredProducts.map((p) => (
                            <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedProductDetails && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex flex-col justify-center">
                        <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Product Type / Measure</span>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[12px] font-bold rounded-md">
                            {selectedProductDetails.type?.name || "Unknown"}
                          </span>
                          <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[12px] font-bold rounded-md">
                            {selectedProductDetails.unit?.name || "Unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col justify-center relative overflow-hidden">
                        <TrendingDown className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-red-100 opacity-50" />
                        <span className="text-[12px] font-bold text-red-600 uppercase tracking-wider mb-1 relative z-10">Current Balance</span>
                        <span className="text-[24px] font-bold text-red-900 relative z-10">
                          {openingBalance} {selectedProductDetails.unit?.name}
                        </span>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <PackageMinus className="w-5 h-5 text-[#1e40af]" /> Stock Deduction
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">

                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <label className="text-[14px] font-semibold text-zinc-900">Date Out <span className="text-red-500">*</span></label>
                      <DatePicker
                        value={formData.stockDate}
                        onChange={(date) => setFormData({ ...formData, stockDate: date })}
                        className="border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                    <div className="space-y-2 w-full sm:w-32">
                      <label className="text-[14px] font-semibold text-zinc-900">Quantity <span className="text-red-500">*</span></label>
                      <Input
                        type="number"
                        step="0.01"
                        name="qty"
                        placeholder="QTY"
                        value={formData.qty}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-[14px] font-semibold text-zinc-900">Total Value ($) <span className="text-red-500">*</span></label>
                      <Input
                        type="number"
                        step="0.01"
                        name="value"
                        placeholder="0.00"
                        value={formData.value}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Sidebar Save Section */}
              <div className="flex flex-col justify-end space-y-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-14 text-[16px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: "#1e40af" }}
                >
                  {saving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                  {editingId ? "Update Stock Out" : "Balance Stock"}
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="w-full h-12 text-[15px] font-bold transition-transform hover:scale-[1.02]"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

            </div>
          </form>

          {/* Overview Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200 flex flex-row items-center justify-between">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Recent Stock Out Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Product</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Date</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Qty & Value</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                      </TableCell>
                    </TableRow>
                  ) : stockOuts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-zinc-500 text-[14px]">No records found.</TableCell>
                    </TableRow>
                  ) : (
                    stockOuts.map((s) => (
                      <TableRow key={s._id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center border border-red-200">
                              <PackageMinus className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[15px] text-zinc-900">{s.product?.name || "Unknown"}</span>
                              <span className="text-[12px] text-zinc-500 font-medium">{s.product?.category?.name || "Unknown"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="w-4 h-4 text-zinc-400" />
                            <span className="font-semibold text-zinc-700 text-[14px]">{new Date(s.date).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-zinc-900 text-[14px]">
                              {s.quantity} <span className="text-[12px] text-zinc-500 font-medium">{s.product?.unit?.name}</span>
                            </span>
                            <span className="text-[13px] font-semibold text-red-600">${s.value?.toFixed(2)}</span>
                          </div>
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
                                onSelect={() => handleEdit(s)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onSelect={() => openDeleteDialog(s._id)}
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
