"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle2, Download, Gift, Calendar, MoreHorizontal, Edit, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    toast.success(`Successfully generated ${stickerCount} giftcards starting with ${cardNum}!`);
  };

  const handleDeleteGiftcard = (id) => {
    setGiftcards(giftcards.filter((g) => g.id !== id));
    toast.success("Giftcard deleted.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Create Tasty Bites Gift Card
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Generate printable high-resolution PDF restaurant gift cards and physical stickers.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-8">

            {/* Form Details Section */}
            <div className="space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Gift Card Configuration</CardTitle>
                  <CardDescription className="text-[14px]">Define code prefixes, validity, and monetary value.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Card Number Input */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Card Number (Prefix or Exact)
                    </label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="e.g. TB-NEWYEAR (leave empty for random code)"
                        value={cardNumberInput}
                        onChange={(e) => setCardNumberInput(e.target.value)}
                        className="pl-10 h-11 text-[16px] bg-white uppercase font-mono font-bold tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Date Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  </div>

                  {/* Giftcard value amount */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Amount ($) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cardAmount}
                      onChange={(e) => setCardAmount(e.target.value)}
                      className="h-11 text-[16px] bg-white font-medium"
                    />
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Sidebar Batch Generation */}
            <div className="space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Batch Generation</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Auto generate sticker configuration */}
                  <div className="space-y-3">
                    <label className="text-[14px] font-semibold text-zinc-900 block">
                      Select Sticker Count
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[10, 25, 50, 75, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setStickerCount(num)}
                          className={`py-2 text-[13px] font-bold rounded-lg border transition-all ${stickerCount === num
                            ? "bg-[#F97316] text-white border-[#F97316]"
                            : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                            }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                    style={{ backgroundColor: PALETTE.accent }}
                  >
                    Generate {stickerCount} Gift Cards
                  </Button>

                </CardContent>
              </Card>
            </div>
          </form>

          {/* Giftcard Overview table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200 flex flex-row items-center justify-between">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Giftcard Overview</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-[13px] font-medium hidden sm:flex">
                <FileDown className="w-4 h-4 mr-2" /> Download All PDFs
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Giftcard Number</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Value</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Validity Period</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Export</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {giftcards.length > 0 ? giftcards.map((g) => (
                    <TableRow key={g.id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-zinc-400" />
                          <span className="font-mono font-bold text-[15px] text-zinc-900 tracking-wide">{g.cardNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                        ${g.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[13px] font-medium">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {g.start} to {g.end}
                        </div>
                      </TableCell>

                      {/* Create PDF link */}
                      <TableCell className="px-6 text-center">
                        <button
                          type="button"
                          onClick={() => toast.success(`Downloading PDF for ${g.cardNumber}...`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-md text-[13px] font-semibold transition-all cursor-pointer"
                        >
                          <Download className="h-4 w-4 text-zinc-500" />
                          <span>PDF</span>
                        </button>
                      </TableCell>

                      <TableCell className="px-6 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {g.status}
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
                            <DropdownMenuItem className="text-[14px] font-medium cursor-pointer">
                              <Edit /> Edit GiftCards
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteGiftcard(g.id)}
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-zinc-500 text-[14px]">No giftcards found.</TableCell>
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
