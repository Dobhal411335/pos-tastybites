"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Calendar,
  ImageIcon,
  Trash2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

export default function CreatePromoOfferPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);

  // Form states
  const [offerName, setOfferName] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [description, setDescription] = useState("");
  const [validFrom, setValidFrom] = useState(null);
  const [validTo, setValidTo] = useState(null);

  // Dynamic arrays
  const [inclusions, setInclusions] = useState([""]);
  const [choices, setChoices] = useState([""]);
  const [drinks, setDrinks] = useState([""]);

  // Image Upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [offerImage, setOfferImage] = useState(null);

  const fetchOffers = async () => {
    try {
      const res = await fetch("/api/menu/offers");
      const json = await res.json();
      if (json.success) setOffers(json.data);
    } catch (e) {
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please select an image file.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image size must be less than 5MB.");
    }

    setUploadingImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    const existingKey = offerImage?.key;
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
        setOfferImage({ url: data.url, key: data.key || "" });
      } else {
        toast.error("Cloudinary upload failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("Cloudinary upload error: " + error.message);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    if (!offerName.trim() || !priceAmount || isNaN(parseFloat(priceAmount))) {
      toast.error("Please enter a valid offer name and price.");
      return;
    }

    setSaving(true);

    // Clean arrays
    const cleanInclusions = inclusions.filter(i => i.trim() !== "");
    const cleanChoices = choices.filter(c => c.trim() !== "");
    const cleanDrinks = drinks.filter(d => d.trim() !== "");

    const payload = {
      name: offerName.trim(),
      price: parseFloat(priceAmount),
      description,
      inclusions: cleanInclusions,
      choices: cleanChoices,
      drinks: cleanDrinks,
      validFrom: validFrom ? validFrom.toISOString() : null,
      validTo: validTo ? validTo.toISOString() : null,
      image: offerImage
    };

    try {
      const url = editingOfferId ? `/api/menu/offers/${editingOfferId}` : "/api/menu/offers";
      const method = editingOfferId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingOfferId ? "Offer updated successfully!" : "Promotional offer created successfully!");
        handleCancelEdit();
        fetchOffers();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error(editingOfferId ? "Failed to update offer" : "Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  const handleEditOffer = (id) => {
    const offer = offers.find((o) => o._id === id);
    if (!offer) return;
    
    setEditingOfferId(offer._id);
    setOfferName(offer.name || "");
    setPriceAmount(offer.price?.toString() || "");
    setDescription(offer.description || "");
    setValidFrom(offer.validFrom ? new Date(offer.validFrom) : null);
    setValidTo(offer.validTo ? new Date(offer.validTo) : null);
    
    setInclusions(offer.inclusions?.length ? offer.inclusions : [""]);
    setChoices(offer.choices?.length ? offer.choices : [""]);
    setDrinks(offer.drinks?.length ? offer.drinks : [""]);
    
    setOfferImage(offer.image || null);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingOfferId(null);
    setOfferName("");
    setPriceAmount("");
    setDescription("");
    setValidFrom(null);
    setValidTo(null);
    setInclusions([""]);
    setChoices([""]);
    setDrinks([""]);
    setOfferImage(null);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/menu/offers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !currentStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.info("Offer status toggled.");
        fetchOffers();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to toggle status");
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      const res = await fetch(`/api/menu/offers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Offer deleted successfully.");
        fetchOffers();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to delete offer");
    }
  };

  // Array handlers
  const updateArray = (arr, setter, index, val) => {
    const newArr = [...arr];
    newArr[index] = val;
    setter(newArr);
  };
  const addToArray = (arr, setter) => setter([...arr, ""]);
  const removeFromArray = (arr, setter, index) => {
    const newArr = arr.filter((_, i) => i !== index);
    if (newArr.length === 0) newArr.push("");
    setter(newArr);
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Top Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Festive Offers
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Define special seasonal bundles, happy hour packages, and active coupons.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitOffer} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column */}
            <div className="lg:col-span-8 space-y-6">

              {/* Basic Information */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Basic Information</CardTitle>
                  <CardDescription className="text-[14px]">Give your offer a name and description.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Offer Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Gourmet Burger + Shake Combo"
                      value={offerName}
                      onChange={(e) => setOfferName(e.target.value)}
                      className="h-11 text-[16px] bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Offer Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe what's included..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full h-auto bg-white border border-zinc-200 rounded-md p-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent transition-shadow"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Offer Contents */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Offer Contents</CardTitle>
                  <CardDescription className="text-[14px]">Specify the items and choices included in this offer.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Inclusions */}
                  <div className="space-y-3">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Includes (Products)
                    </label>
                    {inclusions.map((item, index) => (
                      <div key={`inc-${index}`} className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Type Product Name"
                          value={item}
                          onChange={(e) => updateArray(inclusions, setInclusions, index, e.target.value)}
                          className="h-11 text-[16px] bg-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeFromArray(inclusions, setInclusions, index)}
                          className="h-11 w-11 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => addToArray(inclusions, setInclusions)} className="h-9 px-4 font-semibold text-zinc-700">
                      <Plus className="w-4 h-4 mr-2" /> Add Included Item
                    </Button>
                  </div>

                  {/* Choices */}
                  <div className="space-y-3 pt-4 border-t border-zinc-100">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Choice Of
                    </label>
                    {choices.map((item, index) => (
                      <div key={`cho-${index}`} className="flex gap-2 items-center">
                        <Input
                          type="text"
                          placeholder="Type Choice"
                          value={item}
                          onChange={(e) => updateArray(choices, setChoices, index, e.target.value)}
                          className="h-11 text-[15px] bg-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeFromArray(choices, setChoices, index)}
                          className="h-11 w-11 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                        {index < choices.length - 1 && <span className="text-[12px] font-bold text-zinc-400 mx-1">OR</span>}
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => addToArray(choices, setChoices)} className="h-9 px-4 font-semibold text-zinc-700">
                      <Plus className="w-4 h-4 mr-2" /> Add Choice Option
                    </Button>
                  </div>

                  {/* Drinks */}
                  <div className="space-y-3 pt-4 border-t border-zinc-100">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Drink / Liqueur Inclusions
                    </label>
                    {drinks.map((item, index) => (
                      <div key={`drk-${index}`} className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Type Drink Names"
                          value={item}
                          onChange={(e) => updateArray(drinks, setDrinks, index, e.target.value)}
                          className="h-11 text-[16px] bg-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeFromArray(drinks, setDrinks, index)}
                          className="h-11 w-11 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => addToArray(drinks, setDrinks)} className="h-9 px-4 font-semibold text-zinc-700">
                      <Plus className="w-4 h-4 mr-2" /> Add Drink
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-6">

              {/* Pricing & Validity */}
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Pricing & Validity</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Price Amount ($) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="0.00"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      className="h-11 text-[16px] bg-white font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Valid From
                    </label>
                    <DatePicker
                      value={validFrom}
                      onChange={setValidFrom}
                      placeholder="Select start date"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Valid To
                    </label>
                    <DatePicker
                      value={validTo}
                      onChange={setValidTo}
                      placeholder="Select end date"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Offer Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      id="offer-image-upload"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="offer-image-upload"
                      className={`w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-lg h-32 hover:border-[#F97316] hover:bg-orange-50/50 transition-colors cursor-pointer group ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                      ) : offerImage?.url ? (
                        <div className="relative w-full h-full p-1 rounded-md overflow-hidden">
                          <Image
                            width={200}
                            height={150}
                            src={offerImage.url}
                            alt="Offer"
                            className="w-full h-full object-contain rounded-md"
                          />
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

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {editingOfferId ? "Update Offer" : "Create Offer"}
                </Button>
                {editingOfferId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex-1 h-12 text-[15px] font-bold transition-transform hover:scale-[1.02]"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

            </div>
          </form>

          {/* Table Overview */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Active Promotions & Offers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 w-12">Image</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Offer Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Price</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Duration Dates</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.length > 0 ? offers.map((off) => (
                    <TableRow key={off._id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        {off.image?.url ? (
                          <div className="w-10 h-10 rounded-md overflow-hidden border border-zinc-200 bg-white flex items-center justify-center">
                            <Image src={off.image.url} alt={off.name} width={40} height={40} className="object-contain w-full h-full" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6">
                        <span className="text-[15px] font-semibold text-zinc-900">{off.name}</span>
                      </TableCell>
                      <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                        ${Number(off.price || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        {(off.validFrom || off.validTo) ? (
                          <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[13px] font-medium border border-zinc-200">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            {off.validFrom ? format(new Date(off.validFrom), 'MMM d, yyyy') : '...'}
                            {' - '}
                            {off.validTo ? format(new Date(off.validTo), 'MMM d, yyyy') : '...'}
                          </div>
                        ) : (
                          <span className="text-[13px] text-zinc-400 font-medium">No Dates set</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(off._id, off.status)}
                          className="cursor-pointer transition-transform hover:scale-105"
                        >
                          {off.status ? (
                            <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 bg-white">
                            <DropdownMenuItem
                              className="text-[14px] font-medium cursor-pointer"
                              onClick={() => handleEditOffer(off._id)}
                            >
                              <Edit className="w-4 h-4 mr-2" /> Edit Offer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteOffer(off._id)}
                            >
                              <Trash className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mx-auto" /> : <span className="text-zinc-500 text-[14px]">No offers found.</span>}
                      </TableCell>
                    </TableRow>
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
