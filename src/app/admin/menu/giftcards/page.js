"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit, CheckCircle2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function GiftcardsConfigPage() {
  const [giftcards, setGiftcards] = useState([
    { id: 1, cardNumber: "TB-849-204-102", amount: 50.00, start: "2026-07-17", end: "2027-07-17", status: "Active" },
    { id: 2, cardNumber: "TB-104-582-948", amount: 100.00, start: "2026-07-17", end: "2027-07-17", status: "Active" },
  ]);

  const [cardNumberInput, setCardNumberInput] = useState("");
  const [validFrom, setValidFrom] = useState("2026-07-17");
  const [validTo, setValidTo] = useState("2027-07-17");
  const [cardAmount, setCardAmount] = useState("");
  
  // Selected auto-generate stickers
  const [stickerCount, setStickerCount] = useState(10);

  const handleGenerate = (e) => {
    e.preventDefault();

    const amount = parseFloat(cardAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid gift card amount.");
      return;
    }

    const cardNum = cardNumberInput.trim() || `TB-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;

    const newGiftcard = {
      id: Date.now(),
      cardNumber: cardNum,
      amount,
      start: validFrom,
      end: validTo,
      status: "Active",
    };

    setGiftcards([newGiftcard, ...giftcards]);
    setCardNumberInput("");
    setCardAmount("");
    toast.success(`Successfully generated ${stickerCount} stickers starting with ${cardNum}!`);
  };

  const handleDeleteGiftcard = (id) => {
    setGiftcards(giftcards.filter((g) => g.id !== id));
    toast.success("Giftcard deleted.");
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create Tasty Bites Gift Card
          </h2>
          <p className="text-xs text-zinc-400">
            Generate printable high-resolution PDF restaurant gift cards and physical stickers.
          </p>
        </div>
        <Link href="/admin/menu/products">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Products</span>
          </Button>
        </Link>
      </div>

      {/* Main configuration forms */}
      <form onSubmit={handleGenerate} className="space-y-5 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200 max-w-2xl">
        
        {/* Card Number Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Type Tasty Bites Restaurant Card Number (prefix or exact)
          </label>
          <Input
            type="text"
            placeholder="Type Card Number (leave empty for random code)"
            value={cardNumberInput}
            onChange={(e) => setCardNumberInput(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
          />
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Valid From
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
              Valid To
            </label>
            <Input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 text-xs"
            />
          </div>
        </div>

        {/* Giftcard value amount */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Amount ($)
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="Amount / Value"
            value={cardAmount}
            onChange={(e) => setCardAmount(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11"
          />
        </div>

        {/* Auto generate sticker configuration */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Auto Generate Code (Select Sticker Count)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[10, 25, 50, 75, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setStickerCount(num)}
                className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-[10px] border transition-all ${
                  stickerCount === num
                    ? "bg-[#F97316] text-white border-[#F97316]"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                For {num}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#12A594] hover:bg-[#0f8b7b] text-white rounded-[10px] py-6 text-xs uppercase tracking-widest font-black"
        >
          Generate Gift Cards
        </Button>

      </form>

      {/* Giftcard Overview table */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
          Giftcard Overview
        </h3>
        
        <div className="overflow-x-auto border border-[#ECECEC] rounded-[12px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white uppercase text-[9px] tracking-widest font-black">
                <th className="p-4 font-black">Giftcard Number</th>
                <th className="p-4 font-black text-center w-36">Giftcard Value</th>
                <th className="p-4 font-black text-center w-36">Create PDF</th>
                <th className="p-4 font-black text-center w-28">Status</th>
                <th className="p-4 font-black text-center w-24">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] bg-white text-xs text-zinc-800">
              {giftcards.map((g) => (
                <tr key={g.id} className="hover:bg-zinc-50">
                  <td className="p-4 font-mono font-bold text-zinc-900">{g.cardNumber}</td>
                  <td className="p-4 text-center font-extrabold text-[#F97316]">${g.amount.toFixed(2)}</td>
                  
                  {/* Create PDF link */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => toast.success("Mock PDF created: downloading report...")}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[10px] text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{g.status}</span>
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteGiftcard(g.id)}
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
