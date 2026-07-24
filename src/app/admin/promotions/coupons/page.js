"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Calendar as CalendarIcon, ArrowUpDown, Tag, MoreHorizontal, Edit, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function CouponsConfigPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState(undefined);
  const [endDate, setEndDate] = useState(undefined);
  const [amountValue, setAmountValue] = useState("");
  const [percentValue, setPercentValue] = useState("");
  const [selectedType, setSelectedType] = useState("amount"); // 'amount' or 'percent'

  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/menu/coupons");
      const json = await res.json();
      if (json.success) setCoupons(json.data);
    } catch (error) {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    const value = selectedType === "amount" ? parseFloat(amountValue) : parseFloat(percentValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid discount value.");
      return;
    }

    try {
      const payload = {
        code: code.trim(),
        discountType: selectedType,
        value,
        validFrom: startDate ? format(startDate, "yyyy-MM-dd") : null,
        validUntil: endDate ? format(endDate, "yyyy-MM-dd") : null
      };

      const url = editingId ? `/api/menu/coupons/${editingId}` : "/api/menu/coupons";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success(editingId ? "Coupon updated successfully!" : "Coupon created successfully!");
        if (editingId) {
          setCoupons(coupons.map(c => c._id === editingId ? json.data : c));
        } else {
          setCoupons([json.data, ...coupons]);
        }
        
        // Reset form
        setEditingId(null);
        setCode("");
        setAmountValue("");
        setPercentValue("");
        setStartDate(undefined);
        setEndDate(undefined);
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error(`Failed to ${editingId ? "update" : "create"} coupon`, e);
    }
  };

  const handleEditClick = (coupon) => {
    setEditingId(coupon._id);
    setCode(coupon.code);
    setSelectedType(coupon.discountType);
    if (coupon.discountType === "amount") {
      setAmountValue(coupon.value);
      setPercentValue("");
    } else {
      setPercentValue(coupon.value);
      setAmountValue("");
    }
    setStartDate(coupon.validFrom ? new Date(coupon.validFrom) : undefined);
    setEndDate(coupon.validUntil ? new Date(coupon.validUntil) : undefined);
    
    // Scroll to top to see the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/menu/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Coupon set to ${newStatus}`);
        setCoupons(coupons.map(c => c._id === id ? { ...c, status: newStatus } : c));
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
      const res = await fetch(`/api/menu/coupons/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Coupon deleted");
        setCoupons(coupons.filter(c => c._id !== deleteId));
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to delete coupon");
    } finally {
      setDeleteId(null);
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
                Create Discount & Coupon Offer
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Define promotional discount codes, validity dates, and flat or percent deductions.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCoupon} className="grid grid-cols-1 gap-8">

            {/* Form Section */}
            <div className="space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900">Coupon Details</CardTitle>
                  <CardDescription className="text-[14px]">Configure the code, deduction, and validity.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Code Input */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Discount Offer Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="e.g. SUMMER25"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="pl-10 h-11 text-[16px] bg-white uppercase font-mono font-bold tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Date inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Start Date
                      </label>
                      <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Pick a start date"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        End Date
                      </label>
                      <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="Pick an end date"
                      />
                    </div>
                  </div>

                  {/* Deduction Section */}
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <label className="text-[14px] font-semibold text-zinc-900 mt-4 block">
                      Deduction Type & Value <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-6">

                      {/* Flat Amount Option */}
                      <div
                        onClick={() => setSelectedType("amount")}
                        className={`flex-1 flex flex-col gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedType === "amount" ? "border-[#F97316] bg-orange-50/30" : "border-zinc-200 hover:border-zinc-300 bg-white"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedType === "amount" ? "border-[#F97316]" : "border-zinc-300"}`}>
                            {selectedType === "amount" && <div className="w-2 h-2 rounded-full bg-[#F97316]" />}
                          </div>
                          <span className="text-[14px] font-bold text-zinc-900">Flat Amount ($)</span>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          readOnly={selectedType !== "amount"}
                          value={amountValue}
                          onChange={(e) => {
                            setAmountValue(e.target.value);
                            setSelectedType("amount");
                          }}
                          className={`h-11 text-[16px] bg-white font-medium ${selectedType !== "amount" ? "opacity-50 cursor-pointer" : ""}`}
                        />
                      </div>

                      {/* Percentage Option */}
                      <div
                        onClick={() => setSelectedType("percent")}
                        className={`flex-1 flex flex-col gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedType === "percent" ? "border-[#F97316] bg-orange-50/30" : "border-zinc-200 hover:border-zinc-300 bg-white"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedType === "percent" ? "border-[#F97316]" : "border-zinc-300"}`}>
                            {selectedType === "percent" && <div className="w-2 h-2 rounded-full bg-[#F97316]" />}
                          </div>
                          <span className="text-[14px] font-bold text-zinc-900">Percentage (%)</span>
                        </div>
                        <Input
                          type="number"
                          placeholder="0"
                          readOnly={selectedType !== "percent"}
                          value={percentValue}
                          onChange={(e) => {
                            setPercentValue(e.target.value);
                            setSelectedType("percent");
                          }}
                          className={`h-11 text-[16px] bg-white font-medium ${selectedType !== "percent" ? "opacity-50 cursor-pointer" : ""}`}
                        />
                      </div>

                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Sidebar Save Section */}
              <div className="lg:col-span-4 flex flex-col justify-end">
                  <Button
                    type="submit"
                    className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                    style={{ backgroundColor: PALETTE.accent }}
                  >
                    {editingId ? "Update Coupon Offer" : "Create Coupon Offer"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 mt-2 text-[15px] font-bold"
                      onClick={() => {
                        setEditingId(null);
                        setCode("");
                        setAmountValue("");
                        setPercentValue("");
                        setStartDate(undefined);
                        setEndDate(undefined);
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
              </div>
            </div>

          </form>

          {/* Coupon List Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Coupon Offer Overview</CardTitle>
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
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Discount Value</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Validity Period</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                  ) : coupons.length > 0 ? coupons.map((c) => (
                    <TableRow key={c._id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6 font-bold text-[15px] text-zinc-900 tracking-wide">
                        {c.code}
                      </TableCell>
                      <TableCell className="px-6">
                        <span className="text-[14px] capitalize font-medium text-zinc-600">{c.discountType}</span>
                      </TableCell>
                      <TableCell className="px-6 font-bold text-[15px] text-[#F97316]">
                        {c.discountType === "amount" ? `$${c.value.toFixed(2)}` : `${c.value}%`}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[13px] font-medium">
                          <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                          {c.validFrom ? new Date(c.validFrom).toLocaleDateString() : "Anytime"} - {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : "Anytime"}
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c._id, c.status)}
                          className="cursor-pointer transition-transform hover:scale-105"
                        >
                          {c.status === "Active" ? (
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
                      <TableCell className="px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 bg-white">
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-blue-600 focus:bg-blue-500 focus:text-white cursor-pointer"
                              onClick={() => handleEditClick(c)}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                              onClick={() => handleDeleteClick(c._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-zinc-500 text-[14px]">No coupons found.</TableCell>
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
        title="Delete Coupon"
        description="Are you sure you want to delete this coupon? This will permanently remove the discount from any attached products."
      />
    </div>
  );
}
