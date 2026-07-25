"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle2, ArrowUpDown, MoreHorizontal, Tag, FolderTree, Package, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

import { Label } from "@/components/ui/label";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function ApplyDiscountsPage() {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCoupon, setSelectedCoupon] = useState("");
  const [selectedMenuCategory, setSelectedMenuCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  const [editingProductId, setEditingProductId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Decide whether to apply to category or product
  const [targetMode, setTargetMode] = useState("Category"); // 'Category' or 'Product'

  const fetchData = async () => {
    try {
      const [coupRes, catRes, prodRes] = await Promise.all([
        fetch("/api/menu/coupons"),
        fetch("/api/menu/categories"),
        fetch("/api/menu/products")
      ]);
      const coupJson = await coupRes.json();
      const catJson = await catRes.json();
      const prodJson = await prodRes.json();

      if (coupJson.success) setCoupons(coupJson.data.filter(c => c.status === "Active"));
      if (catJson.success) setCategories(catJson.data);
      if (prodJson.success) setProducts(prodJson.data);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!selectedCoupon) return toast.error("Please select a coupon");
    
    let targetId;
    if (targetMode === "Category") {
      if (!selectedMenuCategory) return toast.error("Please select a category");
      targetId = selectedMenuCategory;
    } else {
      if (!selectedProduct) return toast.error("Please select a product");
      targetId = selectedProduct;
    }

    try {
      const res = await fetch("/api/menu/discounts/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponId: selectedCoupon,
          targetType: targetMode === "Category" ? "menu" : "product", // 'menu' or 'product'
          targetId: targetId
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingProductId ? "Discount updated!" : `Discount applied to ${json.data.updatedCount} products!`);
        fetchData(); // reload products to show applied discounts
        
        // Reset form
        setEditingProductId(null);
        setSelectedCoupon("");
        setSelectedMenuCategory("");
        setSelectedProduct("");
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error(`Failed to ${editingProductId ? "update" : "apply"} discount`);
    }
  };

  const handleEditClick = (app) => {
    setEditingProductId(app.id); // Product ID
    setTargetMode("Product");
    setSelectedProduct(app.id);
    setSelectedCoupon(app.couponId); // Need to make sure app has couponId
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/menu/products/${deleteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount: null })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Discount removed from product");
        fetchData();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to remove discount");
    } finally {
      setDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleToggleStatus = async (couponId, currentActive) => {
    const newStatus = currentActive ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/menu/coupons/${couponId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Coupon set to ${newStatus}`);
        fetchData(); // reload products to show new status
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const appliedDiscounts = products
    .filter(p => p.discount)
    .map(p => ({
      id: p._id,
      couponId: p.discount._id,
      code: p.discount.code,
      targetType: "Product",
      targetName: p.name,
      active: p.discount.status === "Active"
    }));



  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Apply Coupon to Menu / Products
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Map active discount codes to entire menu categories or select standalone products.
              </p>
            </div>
          </div>

          <form onSubmit={handleApplyCoupon} className="grid grid-cols-1 gap-8">

            {/* Form Section */}
            <div className="space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Discount Target Selection</CardTitle>
                  <CardDescription className="text-[14px]">Select the coupon code and choose what it applies to.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Select Discount Offer Coupon Code */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Select Discount Offer Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />

                        <Select
                          value={selectedCoupon}
                          onValueChange={setSelectedCoupon}
                        >
                          <SelectTrigger className="w-full h-11 pl-10 text-[15px] font-mono font-semibold border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                            <SelectValue placeholder="Select Coupon Code" />
                          </SelectTrigger>

                          <SelectContent className="max-h-60 overflow-y-auto" style={{ backgroundColor: PALETTE.canvas }}>
                            {coupons.map(c => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.code} ({c.discountType === "percent" ? `${c.value}% OFF` : `$${c.value} OFF`})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                  </div>

                  {/* Target Mode */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-[14px] font-semibold text-zinc-900">
                      Apply Target Selection
                    </Label>

                    <RadioGroup
                      value={targetMode}
                      onValueChange={setTargetMode}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="category"
                        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${targetMode === "Category"
                          ? "border-[#F97316] bg-orange-50"
                          : "border-zinc-200 hover:border-zinc-300"
                          }`}
                      >
                        <RadioGroupItem value="Category" id="category" />

                        <FolderTree
                          className={`h-6 w-6 ${targetMode === "Category"
                            ? "text-[#F97316]"
                            : "text-zinc-400"
                            }`}
                        />

                        <div>
                          <p className="font-semibold text-sm">
                            Menu Category
                          </p>

                          <p className="text-xs text-zinc-500">
                            Apply coupon to a category
                          </p>
                        </div>
                      </Label>

                      <Label
                        htmlFor="product"
                        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${targetMode === "Product"
                          ? "border-[#F97316] bg-orange-50"
                          : "border-zinc-200 hover:border-zinc-300"
                          }`}
                      >
                        <RadioGroupItem value="Product" id="product" />

                        <Package
                          className={`h-6 w-6 ${targetMode === "Product"
                            ? "text-[#F97316]"
                            : "text-zinc-400"
                            }`}
                        />

                        <div>
                          <p className="font-semibold text-sm">
                            Single Product
                          </p>

                          <p className="text-xs text-zinc-500">
                            Apply coupon to one product
                          </p>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  {/* Category selection */}
                  {targetMode === "Category" ? (
                    <div className="space-y-2">
                      <Label>Select Menu Category</Label>

                      <div className="relative">
                        <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />

                        <Select
                          value={selectedMenuCategory}
                          onValueChange={setSelectedMenuCategory}
                        >
                          <SelectTrigger className="h-11 pl-10 border-zinc-200">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>

                          <SelectContent className="max-h-60 overflow-y-auto" style={{ backgroundColor: PALETTE.canvas }}>
                            {categories.map(cat => (
                              <SelectItem key={cat._id} value={cat._id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    /* Product selection */
                    <div className="space-y-2">
                      <Label>Select Product</Label>

                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />

                        <Select
                          value={selectedProduct}
                          onValueChange={setSelectedProduct}
                        >
                          <SelectTrigger className="h-11 pl-10 border-zinc-200">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>

                          <SelectContent className="max-h-60 overflow-y-auto" style={{ backgroundColor: PALETTE.canvas }}>
                            {products.map(p => (
                              <SelectItem key={p._id} value={p._id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>

              {/* Sidebar Action Section */}
              <div className="lg:col-span-4 flex flex-col justify-end">
                <Button
                  type="submit"
                  className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  {editingProductId ? "Update Applied Discount" : "Apply Discount"}
                </Button>
                
                {editingProductId && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 mt-2 text-[15px] font-bold"
                    onClick={() => {
                      setEditingProductId(null);
                      setSelectedCoupon("");
                      setSelectedMenuCategory("");
                      setSelectedProduct("");
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

          </form>

          {/* Applied discounts table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Active Coupon Mappings Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-700">
                        <span>Promotion Code</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Apply On (Type)</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Target Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                  ) : appliedDiscounts.length > 0 ? appliedDiscounts.map((ad) => (
                    <TableRow key={ad.id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-zinc-400" />
                          <span className="font-mono font-bold text-[15px] text-zinc-900 tracking-wide">{ad.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge variant="outline" className="bg-zinc-50 text-zinc-600 border-zinc-200 font-semibold px-2.5 py-1 text-[13px]">
                          {ad.targetType}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6">
                        <span className="font-semibold text-[15px] text-zinc-800">{ad.targetName}</span>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge 
                          className={ad.active 
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold inline-flex items-center gap-1"
                            : "bg-red-50 text-red-700 hover:bg-red-100 border-none px-2.5 py-1 text-[13px] font-semibold inline-flex items-center gap-1"
                          }
                        >
                          {ad.active ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                          {ad.active ? "Active" : "Inactive"}
                        </Badge>
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
                              className="text-[14px] font-medium text-zinc-600 focus:bg-zinc-100 cursor-pointer"
                              onClick={() => handleToggleStatus(ad.couponId, ad.active)}
                            >
                              <ArrowUpDown className="mr-2 h-4 w-4" /> {ad.active ? "Mark Inactive" : "Mark Active"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-blue-600 focus:bg-blue-500 focus:text-white cursor-pointer"
                              onClick={() => handleEditClick(ad)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteClick(ad.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-zinc-500 text-[14px]">No coupon mappings found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
      
      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Remove Discount"
        description="Are you sure you want to remove the discount from this product?"
      />
    </div>
  );
}
