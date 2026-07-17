"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle2, Upload, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
    setDescription("");
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
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create Promotional Offer
          </h2>
          <p className="text-xs text-zinc-400">
            Define special seasonal bundles, happy hour packages, and active coupons.
          </p>
        </div>
        <Link href="/admin/menu/products">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Products</span>
          </Button>
        </Link>
      </div>

      {/* Main Forms Section */}
      <form onSubmit={handleCreateOffer} className="space-y-6 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200">
        
        {/* Name input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Type Offer Name
          </label>
          <Input
            type="text"
            placeholder="Gourmet Burger + Shake Combo"
            value={offerName}
            onChange={(e) => setOfferName(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316] text-sm"
          />
        </div>

        {/* Dynamic inclusions & choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Offer Include */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Offer Includes (Products)
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type Product Name"
                value={offerInclude}
                onChange={(e) => setOfferInclude(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11"
              />
              <Button type="button" variant="outline" className="h-11 rounded-[10px] px-4 font-bold text-xs uppercase">
                + Add More
              </Button>
            </div>
          </div>

          {/* Choice Off */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Choice Off (Pick up to 3)
            </label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="Type 1"
                value={choice1}
                onChange={(e) => setChoice1(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
              />
              <span className="text-[9px] font-extrabold text-zinc-400">OR</span>
              <Input
                type="text"
                placeholder="Type 2"
                value={choice2}
                onChange={(e) => setChoice2(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
              />
              <span className="text-[9px] font-extrabold text-zinc-400">OR</span>
              <Input
                type="text"
                placeholder="Type 3"
                value={choice3}
                onChange={(e) => setChoice3(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
              />
              <Button type="button" variant="outline" className="h-11 rounded-[10px] px-3 font-bold text-xs uppercase">
                + Add
              </Button>
            </div>
          </div>
        </div>

        {/* Liqueur Choice & Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Liqueur Choice / Drink inclusions
            </label>
            <Input
              type="text"
              placeholder="Type Drink Names"
              className="bg-white border-zinc-200 rounded-[10px] h-11"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Price Amount ($)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Amount / Value"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                className="bg-white border-zinc-200 rounded-[10px] h-11"
              />
              <Button type="button" variant="outline" className="h-11 rounded-[10px] px-4 font-bold text-xs uppercase">
                + Add More
              </Button>
            </div>
          </div>
        </div>

        {/* Description textarea */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Offer Description
          </label>
          <textarea
            rows={3}
            placeholder="Offer Description Here"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-[10px] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
          />
        </div>

        {/* Validity dates & Tax */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Validity From
            </label>
            <Input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Validity To
            </label>
            <Input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast.success("Promo Image uploaded!")}
              className="flex-1 bg-yellow-950 text-white rounded-[10px] h-11 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Offer Image</span>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <Button
          type="submit"
          className="w-full bg-[#12A594] hover:bg-[#0f8b7b] text-white rounded-[10px] py-6 text-xs uppercase tracking-widest font-black"
        >
          Create Promotional Offer
        </Button>

      </form>

      {/* Offers Over View Table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Product Detail Over View (Promotions & Offers)
        </h3>
        
        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">Offer / Promotion Name</th>
                <th className="p-4 font-black text-center w-24">Price</th>
                <th className="p-4 font-black text-center w-36">Duration Dates</th>
                <th className="p-4 font-black text-center w-28">Status</th>
                <th className="p-4 font-black text-center w-24">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {offers.map((off) => (
                <tr key={off.id} className="hover:bg-zinc-50">
                  <td className="p-4 font-bold text-zinc-900">{off.name}</td>
                  <td className="p-4 text-center font-extrabold text-[#F97316]">${off.price.toFixed(2)}</td>
                  <td className="p-4 text-center text-zinc-400 font-bold">
                    <span className="bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded text-[10px]">
                      {off.validFrom} to {off.validTo}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(off.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        off.status ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {off.status ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteOffer(off.id)}
                      className="text-zinc-400 hover:text-red-550 p-1"
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
