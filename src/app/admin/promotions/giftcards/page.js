"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle2, Download, Gift, Calendar as CalendarIcon, MoreHorizontal, Edit, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function GiftcardsConfigPage() {
  const [giftcards, setGiftcards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [giftcardName, setGiftcardName] = useState("");
  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [validFrom, setValidFrom] = useState(undefined);
  const [validUntil, setValidUntil] = useState(undefined);
  const [stickerCount, setStickerCount] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchGiftcards = async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/menu/giftcards?page=${page}&limit=10`);
      const json = await res.json();
      if (json.success) {
        setGiftcards(json.data.batches);
        setCurrentPage(json.data.pagination.page);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error("Failed to load giftcards");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchGiftcards(currentPage);
  }, [currentPage]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!giftcardName.trim()) {
      toast.error("Please enter a gift card name.");
      return;
    }

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid gift card value.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: giftcardName.trim() || "Gift Card",
        discountType,
        value,
        validFrom: validFrom ? format(validFrom, "yyyy-MM-dd") : null,
        validUntil: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
      };

      if (!editingId) {
        payload.count = stickerCount;
      }

      const url = editingId ? `/api/menu/giftcards/${editingId}` : "/api/menu/giftcards";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "Giftcard batch updated successfully" : json.message);
        fetchGiftcards(currentPage);
        setEditingId(null);
        setGiftcardName("");
        setDiscountValue("");
        setValidFrom(undefined);
        setValidUntil(undefined);
        setStickerCount(1);
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error(`Failed to ${editingId ? "update" : "generate"} giftcards`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (g) => {
    setEditingId(g._id);
    setGiftcardName(g.name);
    setDiscountType("amount");
    setDiscountValue(g.value);
    setValidFrom(g.validFrom ? new Date(g.validFrom) : undefined);
    setValidUntil(g.validUntil ? new Date(g.validUntil) : undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/menu/giftcards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Batch status set to ${newStatus}`);
        fetchGiftcards(currentPage);
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/menu/giftcards/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Giftcard batch deleted");
        fetchGiftcards(currentPage);
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to delete giftcard");
    } finally {
      setDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                {editingId ? "Edit Gift Card" : "Create Tasty Bites Gift Card"}
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Generate printable high-resolution PDF restaurant gift cards and physical stickers.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Form Details Section */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Gift Card Configuration</CardTitle>
                  <CardDescription className="text-[14px]">Define code prefixes, validity, and monetary value.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Giftcard Name */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Gift Card Name
                    </label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="e.g. Welcome Gift"
                        value={giftcardName}
                        onChange={(e) => setGiftcardName(e.target.value)}
                        className="pl-10 h-11 text-[16px] bg-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Validity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Valid From
                      </label>
                      <DatePicker
                        value={validFrom}
                        onChange={setValidFrom}
                        placeholder="Pick a start date"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Valid Until
                      </label>
                      <DatePicker
                        value={validUntil}
                        onChange={setValidUntil}
                        placeholder="Pick an expiry date"
                      />
                    </div>
                  </div>

                  {/* Value */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Amount Value ($) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="h-11 text-[16px] bg-white font-medium"
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Sidebar Batch Generation */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {!editingId && (
                <Card className="shadow-sm border-zinc-200 bg-white">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="text-[16px] font-bold text-zinc-900">Batch Options</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900 flex justify-between">
                        <span>Number to Generate</span>
                        <span className="text-zinc-500 font-normal">{stickerCount}</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={stickerCount}
                        onChange={(e) => setStickerCount(parseInt(e.target.value))}
                        className="w-full accent-[#F97316]"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {editingId ? "Update Giftcard" : `Generate ${stickerCount} Giftcard${stickerCount > 1 ? "s" : ""}`}
                </Button>
                
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 mt-2 text-[15px] font-bold"
                    onClick={() => {
                      setEditingId(null);
                      setGiftcardName("");
                      setDiscountValue("");
                      setValidUntil(undefined);
                      setStickerCount(1);
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
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
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Batch Name & Details</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Value</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Validity Period</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Export</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                  ) : giftcards.length > 0 ? giftcards.map((g) => (
                    <TableRow key={g._id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-[15px] text-zinc-900 tracking-wide flex items-center gap-2">
                            <Gift className="w-4 h-4 text-[#F97316]" /> {g.name || "Gift Card Batch"}
                          </span>
                          <span className="text-[13px] text-zinc-500">{g.count} Card{g.count > 1 ? "s" : ""} generated on {new Date(g.createdAt).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center font-bold text-[15px] text-[#F97316]">
                        ${g.value.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {g.validFrom && (
                            <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[13px] font-medium w-max">
                              <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                              From: {new Date(g.validFrom).toLocaleDateString()}
                            </div>
                          )}
                          <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[13px] font-medium w-max">
                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                            {g.validUntil ? `To: ${new Date(g.validUntil).toLocaleDateString()}` : "Never expires"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Create PDF link */}
                      <TableCell className="px-6 text-center">
                        <button
                          type="button"
                          onClick={() => toast.success(`Downloading PDF for Batch ${g._id.slice(0, 8)}...`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-md text-[13px] font-semibold transition-all cursor-pointer"
                        >
                          <Download className="h-4 w-4 text-zinc-500" />
                          <span>PDFs ({g.count})</span>
                        </button>
                      </TableCell>

                      <TableCell className="px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(g._id, g.status)}
                          className="cursor-pointer transition-transform hover:scale-105"
                        >
                          {g.status === "Active" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Active
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
                              className="text-[14px] font-medium text-blue-600 focus:bg-blue-500 focus:text-white cursor-pointer"
                              onClick={() => handleEditClick(g)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteClick(g._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
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
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                  <p className="text-[13px] text-zinc-500 font-medium">
                    Showing Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                      className="h-8 px-4"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="h-8 px-4"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
      
      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Batch"
        description="Are you sure you want to delete this entire batch of giftcards? This action cannot be undone."
      />
    </div>
  );
}
