"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, MoreHorizontal, Calendar, Image as ImageIcon, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export default function CreatePromoOfferPage() {
  const [offers, setOffers] = useState([
    {
      id: 1,
      name: "Festive Double Feast Bundle",
      price: 34.99,
      validFrom: "2026-11-20",
      validTo: "2026-12-30",
      status: true,
    },
    {
      id: 2,
      name: "Happy Hour Garlic Special",
      price: 15.00,
      validFrom: "2026-07-01",
      validTo: "2026-08-31",
      status: true,
    },
  ]);

  // Form states
  const [offerName, setOfferName] = useState("");
  const [offerInclude, setOfferInclude] = useState("");
  const [choice1, setChoice1] = useState("");
  const [choice2, setChoice2] = useState("");
  const [choice3, setChoice3] = useState("");
  const [drinkInclusion, setDrinkInclusion] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [description, setDescription] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const handleCreateOffer = (e) => {
    e.preventDefault();
    if (!offerName.trim() || !priceAmount || isNaN(parseFloat(priceAmount))) {
      toast.error("Please enter a valid offer name and price.");
      return;
    }

    const newOffer = {
      id: Date.now(),
      name: offerName.trim(),
      price: parseFloat(priceAmount),
      validFrom: validFrom || "2026-07-17",
      validTo: validTo || "2026-08-17",
      status: true,
    };

    setOffers([...offers, newOffer]);
    setOfferName("");
    setPriceAmount("");
    setOfferInclude("");
    setChoice1("");
    setChoice2("");
    setChoice3("");
    setDrinkInclusion("");
    setDescription("");
    setValidFrom("");
    setValidTo("");
    toast.success("Promotional offer created successfully!");
  };

  const handleToggleStatus = (id) => {
    setOffers(
      offers.map((off) =>
        off.id === id ? { ...off, status: !off.status } : off
      )
    );
    toast.info("Offer status toggled.");
  };

  const handleDeleteOffer = (id) => {
    setOffers(offers.filter((o) => o.id !== id));
    toast.success("Offer deleted successfully.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Top Header & Back Button */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Promotional Offer
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Define special seasonal bundles, happy hour packages, and active coupons.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateOffer} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

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
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Includes (Products)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Type Product Name"
                        value={offerInclude}
                        onChange={(e) => setOfferInclude(e.target.value)}
                        className="h-11 text-[16px] bg-white flex-1"
                      />
                      <Button type="button" variant="outline" className="h-11 px-4 font-semibold shrink-0 text-zinc-700">
                        <Plus className="w-4 h-4 mr-2" /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Choice Of (Pick up to 3)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <Input
                        type="text"
                        placeholder="Choice 1"
                        value={choice1}
                        onChange={(e) => setChoice1(e.target.value)}
                        className="h-11 text-[15px] bg-white"
                      />
                      <span className="text-[12px] font-bold text-zinc-400">OR</span>
                      <Input
                        type="text"
                        placeholder="Choice 2"
                        value={choice2}
                        onChange={(e) => setChoice2(e.target.value)}
                        className="h-11 text-[15px] bg-white"
                      />
                      <span className="text-[12px] font-bold text-zinc-400">OR</span>
                      <Input
                        type="text"
                        placeholder="Choice 3"
                        value={choice3}
                        onChange={(e) => setChoice3(e.target.value)}
                        className="h-11 text-[15px] bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Drink / Liqueur Inclusions
                    </label>
                    <Input
                      type="text"
                      placeholder="Type Drink Names"
                      value={drinkInclusion}
                      onChange={(e) => setDrinkInclusion(e.target.value)}
                      className="h-11 text-[16px] bg-white"
                    />
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
                      step="0.01"
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
                    <Input
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="h-11 text-[15px] bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Valid To
                    </label>
                    <Input
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className="h-11 text-[15px] bg-white"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Offer Image
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.success("Mock upload: promo image selected!")}
                      className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-lg h-28 hover:border-[#F97316] hover:bg-orange-50/50 transition-colors cursor-pointer group"
                    >
                      <div className="h-10 w-10 rounded-full bg-zinc-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                        <ImageIcon className="h-5 w-5 text-zinc-500 group-hover:text-[#F97316]" />
                      </div>
                      <span className="text-[13px] font-medium text-zinc-600 group-hover:text-zinc-900">Upload Image</span>
                    </button>
                  </div>

                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: PALETTE.accent }}
              >
                Create Offer
              </Button>

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
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Offer Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Price</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Duration Dates</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.length > 0 ? offers.map((off) => (
                    <TableRow key={off.id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        <span className="text-[15px] font-semibold text-zinc-900">{off.name}</span>
                      </TableCell>
                      <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                        ${off.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-zinc-200 text-zinc-900 px-2.5 py-1 rounded-md text-[13px] font-medium">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {off.validFrom} to {off.validTo}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(off.id)}
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
                            <DropdownMenuItem className="text-[14px] font-medium cursor-pointer">
                              <Edit/> Edit Promotions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteOffer(off.id)}
                            >
                             <Trash/> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-zinc-500 text-[14px]">No offers found.</TableCell>
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
