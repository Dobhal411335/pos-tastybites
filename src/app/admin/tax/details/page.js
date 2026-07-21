"use client";

import React, { useState } from "react";
import { Trash2, Search, Percent, Edit, MoreHorizontal, FileText, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function TaxDetailsPage() {
  const [taxes, setTaxes] = useState([
    { id: 1, name: "State Sales Tax", rate: "5%", type: "Exclusive", status: "Active" },
    { id: 2, name: "Local City Tax", rate: "2%", type: "Exclusive", status: "Active" },
    { id: 3, name: "VAT", rate: "10%", type: "Inclusive", status: "Inactive" },
    { id: 4, name: "Liquor Tax", rate: "8%", type: "Exclusive", status: "Active" },
  ]);

  const [searchName, setSearchName] = useState("");
  const [searchStatus, setSearchStatus] = useState("all");

  const filteredTaxes = taxes.filter((t) => {
    const matchesName = t.name.toLowerCase().includes(searchName.toLowerCase());
    const matchesStatus = searchStatus === "all" || searchStatus === "" ? true : t.status.toLowerCase() === searchStatus.toLowerCase();
    return matchesName && matchesStatus;
  });

  const handleDelete = (id) => {
    setTaxes(taxes.filter((t) => t.id !== id));
    toast.success("Tax record deleted successfully.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">
          
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
            <Button className="h-10 px-6 font-bold text-[14px] text-white shadow-sm hover:scale-[1.02] transition-transform flex items-center gap-2" style={{ backgroundColor: "#1e40af" }}>
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
          </Card>

          {/* Tax Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#1e40af]" /> Configured Taxes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                  {filteredTaxes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-zinc-500 text-[14px]">
                        No tax configuration found matching filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTaxes.map((t) => (
                      <TableRow key={t.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <span className="font-semibold text-[15px] text-zinc-900">{t.name}</span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-orange-50 text-[#F97316] px-3 py-1 rounded-md text-[14px] font-extrabold border border-orange-100">
                            {t.rate}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center font-semibold text-[14px] text-zinc-700">
                          {t.type}
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {t.status === 'Active' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1.5 text-[13px] font-semibold">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-3 py-1.5 text-[13px] font-semibold">
                              Inactive
                            </Badge>
                          )}
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
                                <Edit className="mr-2 h-4 w-4" /> Edit Tax
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => handleDelete(t.id)}
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
          </Card>

        </div>
      </div>
    </div>
  );
}
