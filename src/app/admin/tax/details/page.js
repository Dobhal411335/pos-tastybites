"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Search, Percent, Edit, MoreHorizontal, FileText, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function TaxDetailsPage() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [searchStatus, setSearchStatus] = useState("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState(null);

  const [form, setForm] = useState({ name: "", value: "", type: "Percent" });
  const [editId, setEditId] = useState(null);

  const fetchTaxes = useCallback(async () => {
    try {
      const res = await fetch("/api/tax");
      const json = await res.json();
      if (json.success) {
        setTaxes(json.data);
      }
    } catch (e) {
      toast.error("Failed to load taxes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const filteredTaxes = taxes.filter((t) => {
    const matchesName = t.name.toLowerCase().includes(searchName.toLowerCase());
    const matchesStatus = searchStatus === "all" || searchStatus === "" ? true : t.status.toLowerCase() === searchStatus.toLowerCase();
    return matchesName && matchesStatus;
  });

  const handleOpenCreate = () => {
    setForm({ name: "", value: "", type: "Percent" });
    setEditId(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (tax) => {
    setForm({ name: tax.name, value: tax.value, type: tax.type });
    setEditId(tax._id);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.value || !form.type) {
      return toast.error("Please fill in all fields.");
    }

    try {
      const url = "/api/tax";
      const method = editId ? "PUT" : "POST";
      const payload = editId ? { _id: editId, ...form } : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`Tax ${editId ? "updated" : "created"} successfully`);
        setIsDialogOpen(false);
        fetchTaxes();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleToggleStatus = async (tax) => {
    const newStatus = tax.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: tax._id, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Status updated to ${newStatus}`);
        setTaxes(taxes.map(t => t._id === tax._id ? { ...t, status: newStatus } : t));
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleDeletePrompt = (id) => {
    setTaxToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!taxToDelete) return;
    try {
      const res = await fetch(`/api/tax?id=${taxToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Tax record deleted successfully.");
        fetchTaxes();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to delete tax");
    } finally {
      setIsDeleteDialogOpen(false);
      setTaxToDelete(null);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-4 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Tax Configuration
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Manage tax rates, types, and statuses for billing and orders.
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="h-10 px-6 font-bold text-[14px] text-white shadow-sm hover:scale-[1.02] transition-transform flex items-center gap-2" style={{ backgroundColor: "#1e40af" }}>
              <PlusCircle className="w-4 h-4" />
              Create New Tax
            </Button>
          </div>

          {/* Search Filters */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
              <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-zinc-400" /> Filter Options
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900">
                    Tax Name
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <Input
                      type="text"
                      placeholder="e.g. VAT, City Tax..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="pl-10 h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900">
                    Status
                  </label>
                  <Select value={searchStatus} onValueChange={setSearchStatus}>
                    <SelectTrigger className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>

            {/* Tax Table Section */}
            <div className="border-t border-zinc-200">
              <CardHeader className="px-5 border-b border-zinc-200 bg-white">
                <CardTitle className="text-[16px] font-bold text-zinc-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#1e40af]" /> Configured Taxes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Tax Name</TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Rate</TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Type</TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                        </TableCell>
                      </TableRow>
                    ) : filteredTaxes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-zinc-500 text-[14px]">
                          No tax configuration found matching filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTaxes.map((t) => (
                        <TableRow key={t._id} className="h-16 hover:bg-zinc-50 transition-colors">
                          <TableCell className="px-6">
                            <span className="font-semibold text-[15px] text-zinc-900">{t.name}</span>
                          </TableCell>
                          <TableCell className="px-6 text-center">
                            <span className="inline-flex items-center justify-center bg-orange-50 text-[#F97316] px-3 py-1 rounded-md text-[14px] font-extrabold border border-orange-100">
                              {t.type === "Amount" ? "$" : ""}{t.value}{t.type === "Percent" ? "%" : ""}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 text-center font-semibold text-[14px] text-zinc-700">
                            {t.type}
                          </TableCell>
                          <TableCell className="px-6 text-center">
                            <Button
                              variant="ghost"
                              className="p-0 h-auto hover:bg-transparent"
                              onClick={() => handleToggleStatus(t)}
                            >
                              {t.status === 'Active' ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer">
                                  Inactive
                                </Badge>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="px-6 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 bg-white">
                                <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onClick={() => { setTimeout(() => handleOpenEdit(t), 150) }}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit Tax
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                  onClick={() => { setTimeout(() => handleDeletePrompt(t._id), 150) }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
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
            </div>
          </Card>

        </div>
      </div>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editId ? "Edit Tax" : "Create New Tax"}</DialogTitle>
            <DialogDescription>
              {editId ? "Modify the properties of this tax." : "Add a new tax rate to your restaurant."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Tax Name</label>
              <Input
                placeholder="e.g. State Tax"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="border-zinc-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700">Type</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="border-zinc-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white max-h-60 overflow-y-auto">
                    <SelectItem value="Percent">Percent (%)</SelectItem>
                    <SelectItem value="Amount">Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700">Rate / Value</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5.0"
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  className="border-zinc-200"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-zinc-200">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#1e40af] text-white">Save Tax</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Tax"
        description="Are you sure you want to delete this tax record? This action cannot be undone."
      />

    </div>
  );
}
