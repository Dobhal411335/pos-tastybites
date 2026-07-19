"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Download, Search, MoreHorizontal, Edit, Trash, FileDown, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function GuestDetailPage() {
  const [guests, setGuests] = useState([
    { id: 1, name: "Alexander Wright", email: "alex.wright@gmail.com", phone: "+1 604-555-0192" },
    { id: 2, name: "Chantel Tremblay", email: "c.tremblay@yahoo.ca", phone: "+1 514-555-0183" },
    { id: 3, name: "Emily Watson", email: "emilyw@outlook.com", phone: "+1 416-555-0122" },
    { id: 4, name: "Marcus Johnson", email: "mjohnson@hotmail.com", phone: "+1 780-555-0145" },
  ]);

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterQuery, setFilterQuery] = useState({ name: "", phone: "" });

  const handleSearch = (e) => {
    e.preventDefault();
    setFilterQuery({ name: searchName.trim(), phone: searchPhone.trim() });
  };

  const filteredGuests = guests.filter((g) => {
    const matchesName = g.name.toLowerCase().includes(filterQuery.name.toLowerCase());
    const matchesPhone = g.phone.includes(filterQuery.phone);
    return matchesName && matchesPhone;
  });

  const handleDelete = (id) => {
    setGuests(guests.filter((g) => g.id !== id));
    toast.success("Guest record deleted successfully.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Guest Detail
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Search guest contact information and view dining history.
              </p>
            </div>

          </div>

          {/* Search Filters */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
              <CardTitle className="text-[18px] font-bold text-zinc-900">Search Options</CardTitle>
              <CardDescription className="text-[14px]">Find guests by name or phone number.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900">
                    Guest Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <Input
                      type="text"
                      placeholder="e.g. Alexander"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="pl-10 h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <Input
                      type="text"
                      placeholder="e.g. 604-555"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      className="pl-10 h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: PALETTE.accent }}
                >
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Guest Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200">
              <CardTitle className="text-[16px] font-bold text-zinc-900">Guest Accounts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Guest Name</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Email</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Phone</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Order History</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-zinc-500 text-[14px]">
                        No guest record found matching filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGuests.map((g) => (
                      <TableRow key={g.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                              <User className="w-4 h-4 text-zinc-500" />
                            </div>
                            <span className="font-semibold text-[15px] text-zinc-900">{g.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Mail className="w-4 h-4 text-zinc-400" />
                            <span className="text-[14px]">{g.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex items-center gap-2 text-[#F97316] font-semibold text-[14px]">
                            <Phone className="w-4 h-4 opacity-70" />
                            <span>{g.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <button
                            type="button"
                            onClick={() => toast.success(`Downloading order history PDF for ${g.name}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-md text-[13px] font-semibold transition-all cursor-pointer"
                          >
                            <FileDown className="h-4 w-4 text-zinc-500" />
                            <span>Download</span>
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
                                <Edit className="mr-2 h-4 w-4" /> Edit Guest
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => handleDelete(g.id)}
                              >
                                <Trash className="mr-2 h-4 w-4" /> Delete
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
