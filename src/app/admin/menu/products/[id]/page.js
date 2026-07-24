"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, Upload, MoreHorizontal, Image as ImageIcon, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Image from "next/image";

export default function ProductDetailsConfigPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Product state
  const [product, setProduct] = useState(null);

  // Table lists
  const [variants, setVariants] = useState([]);
  const [addons, setAddons] = useState([]);

  // Form states
  const [description, setDescription] = useState("");
  const [taxValue, setTaxValue] = useState("0");
  const [availableTaxes, setAvailableTaxes] = useState([]);
  const [selectedTaxes, setSelectedTaxes] = useState([]);



  // Custom selection lists
  const [sizesList, setSizesList] = useState([]);
  const [addonsList, setAddonsList] = useState([]);

  // Custom Modal states
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);

  const [newSizeName, setNewSizeName] = useState("");
  const [newAddonName, setNewAddonName] = useState("");

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/menu/products/${id}`);
      const json = await res.json();
      if (json.success) {
        const p = json.data;
        setProduct(p);
        setDescription(p.description || "");
        setTaxValue(p.taxValue?.toString() || "0");
        setVariants(p.variants || []);
        setAddons(p.addons || []);
        setSelectedTaxes(p.taxes?.map(t => typeof t === 'object' ? t._id : t) || []);
      } else {
        toast.error("Failed to load product details");
        router.push("/admin/menu/products");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxes = async () => {
    try {
      const res = await fetch("/api/tax");
      const json = await res.json();
      if (json.success) {
        setAvailableTaxes(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSizes = async () => {
    try {
      const res = await fetch("/api/menu/sizes");
      const json = await res.json();
      if (json.success) setSizesList(json.data.map(s => s.name));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAddons = async () => {
    try {
      const res = await fetch("/api/menu/addons");
      const json = await res.json();
      if (json.success) setAddonsList(json.data.map(a => a.name));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchTaxes();
      fetchSizes();
      fetchAddons();
    }
  }, [id]);

  const handleAddSizeSubmit = async (e) => {
    e.preventDefault();
    if (!newSizeName.trim()) {
      toast.error("Please enter a size name.");
      return;
    }

    try {
      const res = await fetch("/api/menu/sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSizeName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Size option created!");
        setNewSizeName("");
        setIsSizeModalOpen(false);
        fetchSizes();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to create size");
    }
  };

  const handleAddAddonSubmit = async (e) => {
    e.preventDefault();
    if (!newAddonName.trim()) {
      toast.error("Please enter a valid name.");
      return;
    }

    try {
      const res = await fetch("/api/menu/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAddonName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Addon configured!");
        setNewAddonName("");
        setIsAddonModalOpen(false);
        fetchAddons();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to create addon");
    }
  };



  const handleToggleVariantStatus = (index) => {
    const newVariants = [...variants];
    newVariants[index].status = !newVariants[index].status;
    setVariants(newVariants);
  };

  const handleDeleteVariant = (index) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  const handleToggleAddonStatus = (index) => {
    const newAddons = [...addons];
    newAddons[index].status = !newAddons[index].status;
    setAddons(newAddons);
  };

  const handleDeleteAddon = (index) => {
    const newAddons = [...addons];
    newAddons.splice(index, 1);
    setAddons(newAddons);
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/menu/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          taxValue: parseFloat(taxValue) || 0,
          taxes: availableTaxes.map(t => t._id),
          variants: variants.filter(v => v.size).map(v => ({ ...v, price: parseFloat(v.price) || 0 })),
          addons: addons.filter(a => a.name).map(a => ({ ...a, price: parseFloat(a.price) || 0 })),
          image: product?.image
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Product configuration saved successfully!");
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please select an image file.");
    }

    // Quick size check (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image size must be less than 5MB.");
    }

    setUploadingImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    const existingKey = product?.image?.key;
    if (existingKey) {
      try { await fetch(`/api/cloudinary?key=${existingKey}`, { method: 'DELETE' }); } catch (e) { }
    }

    try {
      const res = await fetch("/api/cloudinary", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        toast.success("Image uploaded!");
        setProduct((prev) => ({ ...prev, image: { url: data.url, key: data.key || "" } }));
      } else {
        toast.error("Cloudinary upload failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("Cloudinary upload error: " + error.message);
    } finally {
      setUploadingImage(false);
      // Reset input value so same file can be selected again if needed
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: PALETTE.canvas }}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-300 mx-auto space-y-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column (Main Form Fields) */}
              <div className="lg:col-span-8 space-y-6">

                {/* Basic Info Card */}
                <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="text-[18px] font-bold text-zinc-900">Basic Information</CardTitle>
                    <CardDescription className="text-[14px]">Update the description for {product?.name}.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-4 space-y-2">
                        <label className="text-[14px] font-semibold text-zinc-900">
                          Product Name (Read-Only)
                        </label>
                        <Input
                          disabled
                          className="h-11 text-[16px] bg-zinc-50 cursor-not-allowed"
                          value={product?.name || ""}
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
                    <div className="space-y-4">
                      {variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end border border-zinc-100 p-4 rounded-md bg-zinc-50/50">
                          <div className="space-y-2">
                            <label className="text-[14px] font-semibold text-zinc-900">
                              Price Amount ($) <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={variant.price || ""}
                              onChange={(e) => {
                                const newVariants = [...variants];
                                newVariants[index].price = e.target.value;
                                setVariants(newVariants);
                              }}
                              className="h-11 text-[16px] bg-white font-medium"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[14px] font-semibold text-zinc-900">
                              Size Option
                            </label>
                            <div className="flex gap-2">
                              <Select
                                value={variant.size || ""}
                                onValueChange={(val) => {
                                  const newVariants = [...variants];
                                  newVariants[index].size = val;
                                  setVariants(newVariants);
                                }}
                              >
                                <SelectTrigger className="h-11 text-[16px] bg-white flex-1">
                                  <SelectValue placeholder="Select Size" />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-60 overflow-y-auto">
                                  {sizesList.map((sz, idx) => (
                                    <SelectItem key={idx} value={sz}>{sz}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                onClick={() => setIsSizeModalOpen(true)}
                                variant="outline"
                                className="h-11 w-11 p-0 shrink-0 text-zinc-600 hover:text-zinc-900 border-zinc-200"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleDeleteVariant(index)}
                                className="h-11 w-11 p-0 shrink-0 text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9"
                          onClick={() => setVariants([...variants, { price: "", size: sizesList[0] || "Regular", status: true }])}
                        >
                          Add More Variants
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-6 border-t border-zinc-100">
                      <div className="space-y-4 pt-6 border-t border-zinc-100">
                        <label className="text-[14px] font-semibold text-zinc-900 block">
                          Link Addons
                        </label>
                        {addons.map((addon, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end border border-zinc-100 p-4 rounded-md bg-zinc-50/50">
                            <div className="space-y-2">
                              <label className="text-[13px] font-semibold text-zinc-900">Price Amount ($)</label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={addon.price || ""}
                                onChange={(e) => {
                                  const newAddons = [...addons];
                                  newAddons[index].price = e.target.value;
                                  setAddons(newAddons);
                                }}
                                className="h-11 text-[16px] bg-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[13px] font-semibold text-zinc-900">Addon Selection</label>
                              <div className="flex gap-2">
                                <Select
                                  value={addon.name || ""}
                                  onValueChange={(val) => {
                                    const newAddons = [...addons];
                                    newAddons[index].name = val;
                                    setAddons(newAddons);
                                  }}
                                >
                                  <SelectTrigger className="h-11 text-[16px] bg-white flex-1">
                                    <SelectValue placeholder="Select Addon" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white max-h-60 overflow-y-auto">
                                    {addonsList.map((ad, idx) => (
                                      <SelectItem key={idx} value={ad}>{ad}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  onClick={() => setIsAddonModalOpen(true)}
                                  variant="outline"
                                  className="h-11 w-11 p-0 shrink-0 text-zinc-600 hover:text-zinc-900 border-zinc-200"
                                >
                                  <Plus className="h-5 w-5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDeleteAddon(index)}
                                  className="h-11 w-11 p-0 shrink-0 text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-end mt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-9"
                            onClick={() => setAddons([...addons, { name: addonsList[0] || "", price: "", size: "Regular", status: true }])}
                          >
                            Add More Addons
                          </Button>
                        </div>
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
                    <div className="space-y-3">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Applicable Taxes / Fees
                      </label>
                      {availableTaxes.length > 0 ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-orange-50 border border-orange-100 rounded-md">
                            <p className="text-[13px] text-orange-800 font-medium">
                              {availableTaxes.length} active tax{availableTaxes.length !== 1 ? 'es' : ''} will be automatically applied to this product.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {availableTaxes.map((tax) => (
                              <div
                                key={tax._id}
                                className="flex items-center justify-between p-3 rounded-md border border-zinc-200 bg-zinc-50"
                              >
                                <span className="text-[14px] font-medium text-zinc-900">{tax.name}</span>
                                <span className="text-[13px] font-bold text-zinc-600">
                                  {tax.type === "percent" || tax.type === "Percent" ? `${tax.value}%` : `$${tax.value.toFixed(2)}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-md border border-zinc-200 bg-zinc-50 text-center">
                          <p className="text-[13px] text-zinc-500">No taxes configured.</p>
                          <Link href="/admin/settings" className="text-[13px] text-blue-600 font-medium hover:underline mt-1 block">
                            Configure Taxes
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Product Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        id="product-image-upload"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      <label
                        htmlFor="product-image-upload"
                        className={`w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-lg h-32 hover:border-[#F97316] hover:bg-orange-50/50 transition-colors cursor-pointer group ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        ) : product?.image?.url ? (
                          <div className="relative w-full h-full p-1 rounded-md overflow-hidden">
                            <Image
                              width={100}
                              height={150}
                              src={product.image.url} alt="Product" className="w-full h-full object-contain rounded-md" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                              <span className="text-white text-xs font-semibold">Change Image</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="h-10 w-10 rounded-full bg-zinc-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                              <ImageIcon className="h-5 w-5 text-zinc-500 group-hover:text-[#F97316]" />
                            </div>
                            <span className="text-[13px] font-medium text-zinc-600 group-hover:text-zinc-900">Click to upload image</span>
                          </>
                        )}
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSaveConfiguration}
                  disabled={saving}
                  className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Configuration"}
                </Button>
              </div>
            </div>

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
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 w-[40%]">Size</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Price</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.length > 0 ? variants.map((det, index) => (
                        <TableRow key={index} className="h-16 hover:bg-zinc-50 transition-colors">
                          <TableCell className="px-6">
                            <span className="text-[15px] font-semibold text-zinc-900">{det.size}</span>
                          </TableCell>
                          <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                            ${Number(det.price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleVariantStatus(index)}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteVariant(index)}>
                              <Trash className="h-4 w-4" />
                            </Button>
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
                      {addons.length > 0 ? addons.map((add, index) => (
                        <TableRow key={index} className="h-16 hover:bg-zinc-50 transition-colors">
                          <TableCell className="px-6">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-semibold text-zinc-900">{add.name}</span>
                              <span className="text-[13px] text-zinc-500 mt-0.5">{add.size}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                            ${Number(add.price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAddonStatus(index)}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteAddon(index)}>
                              <Trash className="h-4 w-4" />
                            </Button>
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
              <DialogContent className="sm:max-w-106.25">
                <form onSubmit={handleAddSizeSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-[22px] font-bold text-zinc-900">Create Size Option</DialogTitle>
                    <DialogDescription className="text-[15px]">
                      Add a new size that can be used for pricing variants.
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
                      Save Size Option
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* 2. Create Addons Modal */}
            <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
              <DialogContent className="sm:max-w-106.25">
                <form onSubmit={handleAddAddonSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-[22px] font-bold text-zinc-900">Create Addon</DialogTitle>
                    <DialogDescription className="text-[15px]">
                      Configure a new supplementary product addon.
                    </DialogDescription>
                  </DialogHeader>
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
                  <DialogFooter className="pt-2">
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
        </main >
      </div >
    </div >
  );
}
