"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, MoreHorizontal, Boxes, Trash, AlertTriangle, CheckCircle2, ChevronDown, Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function StockProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [unitMeasures, setUnitMeasures] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    category: "",
    name: "",
    type: "",
    unit: "",
    purchaseAmount: "",
    saleAmount: "",
  });

  // Dialog States for adding new Type / Unit
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [savingSetting, setSavingSetting] = useState(false);

  // Delete Dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [catRes, typeRes, unitRes, prodRes] = await Promise.all([
        fetch("/api/stock/category"),
        fetch("/api/stock/settings?type=productType"),
        fetch("/api/stock/settings?type=unitMeasure"),
        fetch("/api/stock/products")
      ]);

      const [catJson, typeJson, unitJson, prodJson] = await Promise.all([
        catRes.json(),
        typeRes.json(),
        unitRes.json(),
        prodRes.json()
      ]);

      if (catJson.success) setCategories(catJson.data);
      if (typeJson.success) setProductTypes(typeJson.data);
      if (unitJson.success) setUnitMeasures(unitJson.data);
      if (prodJson.success) setProducts(prodJson.data);

    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/stock/products");
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (error) {
      toast.error("Failed to fetch products");
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      category: product.category._id,
      name: product.name,
      type: product.type._id,
      unit: product.unit._id,
      purchaseAmount: product.purchasePrice.toString(),
      saleAmount: product.salePrice.toString()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    if (products.length > 0 && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get("edit");

      if (editId) {
        const productToEdit = products.find(p => p._id === editId);
        if (productToEdit) {
          handleEdit(productToEdit);
          window.history.replaceState(null, "", "/admin/stock/products");
        }
      }
    }
  }, [products]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.name || !formData.type || !formData.unit || !formData.purchaseAmount || !formData.saleAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/stock/products/${editingId}` : "/api/stock/products";
      const method = editingId ? "PUT" : "POST";

      const payload = {
        category: formData.category,
        name: formData.name,
        type: formData.type,
        unit: formData.unit,
        purchasePrice: Number(formData.purchaseAmount),
        salePrice: Number(formData.saleAmount)
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "Product updated" : "Product created");
        handleCancelEdit();
        fetchProducts();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };



  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      category: "",
      name: "",
      type: "",
      unit: "",
      purchaseAmount: "",
      saleAmount: "",
    });
  };

  const openDeleteDialog = (id) => {
    setItemToDelete(id);
    setTimeout(() => setDeleteOpen(true), 100);
  };

  const handleToggleStatus = async (product) => {
    try {
      const newStatus = !product.status;
      const res = await fetch(`/api/stock/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Product status updated to ${newStatus ? 'Active' : 'Inactive'}`);
        fetchProducts();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`/api/stock/products/${itemToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Product deleted");
        fetchProducts();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  const handleCreateSetting = async (settingType) => {
    const isType = settingType === "productType";
    const name = isType ? newTypeName : newUnitName;

    if (!name.trim()) return;
    setSavingSetting(true);

    try {
      const res = await fetch(`/api/stock/settings?type=${settingType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Saved successfully");
        if (isType) {
          setProductTypes(prev => [...prev, json.data]);
          setNewTypeName("");
          setTypeDialogOpen(false);
          setFormData(prev => ({ ...prev, type: json.data._id }));
        } else {
          setUnitMeasures(prev => [...prev, json.data]);
          setNewUnitName("");
          setUnitDialogOpen(false);
          setFormData(prev => ({ ...prev, unit: json.data._id }));
        }
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to save setting");
    } finally {
      setSavingSetting(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <DeleteDialog
        isOpen={deleteOpen}
        onOpenChange={(open) => setDeleteOpen(open)}
        onConfirm={confirmDelete}
        title="Delete Product"
        description="Are you sure you want to delete this stock product? This action cannot be undone."
      />

      {/* Dialog for New Type */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Add New Product Type</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. Raw Material, Processed..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleCreateSetting("productType")} disabled={savingSetting}>
              {savingSetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for New Unit */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Add New Unit Measure</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. Kg, Liters, Pieces..."
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleCreateSetting("unitMeasure")} disabled={savingSetting}>
              {savingSetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-360 mx-auto space-y-8 pb-16 font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Stock Products Master
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Create and manage inventory products, pricing, and categorizations.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8">
            <div className="space-y-6">

              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[16px] font-bold text-zinc-900">
                    {editingId ? "Edit Product" : "Basic Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Selection */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Select
                          value={formData.category}
                          onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                        >
                          <SelectTrigger className="w-full h-11 bg-white border-zinc-200 text-[15px]">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-60 overflow-y-auto">
                            {categories.map((c) => (
                              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Product Name */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        name="name"
                        placeholder="Enter product name"
                        value={formData.name}
                        onChange={handleChange}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>

                    {/* Product Type */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Type <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Select
                            value={formData.type}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                          >
                            <SelectTrigger className="w-full h-11 bg-white border-zinc-200 text-[15px]">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-60 overflow-y-auto">
                              {productTypes.map((t) => (
                                <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0 border-zinc-200"
                          onClick={() => setTypeDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Unit Measure */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Unit Measure <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Select
                            value={formData.unit}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, unit: val }))}
                          >
                            <SelectTrigger className="w-full h-11 bg-white border-zinc-200 text-[15px]">
                              <SelectValue placeholder="Select unit..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-60 overflow-y-auto">
                              {unitMeasures.map((u) => (
                                <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0 border-zinc-200"
                          onClick={() => setUnitDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Information */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[16px] font-bold text-zinc-900">Pricing Matrix</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Purchase Pricing */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[14px] font-semibold text-zinc-900">Purchase Cost Price <span className="text-red-500">*</span></label>
                        <p className="text-[12px] text-zinc-500 font-medium">Standard purchasing price input.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          name="purchaseAmount"
                          placeholder="Amount"
                          value={formData.purchaseAmount}
                          onChange={handleChange}
                          className="h-11 pl-8 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                        />
                      </div>
                    </div>

                    {/* Sale Pricing */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[14px] font-semibold text-zinc-900">Sale Cost Price <span className="text-red-500">*</span></label>
                        <p className="text-[12px] text-zinc-500 font-medium">Standard selling price configuration.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          name="saleAmount"
                          placeholder="Amount"
                          value={formData.saleAmount}
                          onChange={handleChange}
                          className="h-11 pl-8 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Sidebar Save Section */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="shadow-sm border-zinc-200 bg-white sticky top-24">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="sr-only text-[16px] font-bold text-zinc-900">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className=" space-y-4 flex flex-col">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02]"
                      style={{ backgroundColor: PALETTE.accent }}
                    >
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingId ? "Update Product" : "Create Product"}
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
                  </CardContent>
                </Card>
              </div>

            </div>

          </form>

          {/* Overview Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200 flex flex-row items-center justify-between">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Products Inventory Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Product</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Category</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Type & Unit</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Pricing</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-zinc-500 text-[14px]">
                        No products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p._id} className="hover:bg-zinc-50 transition-colors group">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center border border-orange-200">
                              <Boxes className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <span className="font-bold text-[15px] text-zinc-900 block">{p.name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-none px-2.5 py-1 text-[13px] font-semibold">
                            {p.category?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-semibold text-zinc-900">{p.type?.name || "-"}</span>
                            <span className="text-[12px] font-medium text-zinc-500">{p.unit?.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-bold text-zinc-900">CP: ${p.purchasePrice?.toFixed(2)}</span>
                            <span className="text-[14px] font-bold text-emerald-600">SP: ${p.salePrice?.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className={`px-5 py-2 text-[12px] font-bold rounded transition-colors ${p.status
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                          >
                            {p.status ? 'Active' : 'Inactive'}
                          </button>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white">
                              <DropdownMenuItem
                                className="text-[14px] font-medium cursor-pointer"
                                onSelect={() => handleEdit(p)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onSelect={() => openDeleteDialog(p._id)}
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
