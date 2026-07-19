"use client";

import React, { useState } from "react";
import { Trash2, Edit, Utensils, MoreHorizontal, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function CreateTablePage() {
  const [tableNumber, setTableNumber] = useState("");
  const [tables, setTables] = useState([
    { id: 1, tableNumber: "Table 1", status: "Active" },
    { id: 2, tableNumber: "Table 2", status: "Active" },
    { id: 3, tableNumber: "Table 3", status: "Inactive" },
  ]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;
    setTables([...tables, { id: Date.now(), tableNumber: tableNumber.trim(), status: "Active" }]);
    setTableNumber("");
    toast.success("Table created successfully.");
  };

  const handleDelete = (id) => {
    setTables(tables.filter((t) => t.id !== id));
    toast.success("Table deleted successfully.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <Toaster position="top-right" richColors />
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1000px] mx-auto space-y-8 pb-16 font-sans">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Diner Tables
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Create and manage restaurant seating configurations.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center w-full gap-8">
            
            {/* Form Section */}
            <div className="w-full space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-[#1e40af]" /> Add New Table
                  </CardTitle>
                  <CardDescription className="text-[14px]">Define a new table identifier.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Table Number / Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Table 1, VIP A..."
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#1e40af]"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm mt-4"
                      style={{ backgroundColor: "#1e40af" }}
                    >
                      Create Table
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Overview Table */}
            <div className="w-full">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <TableIcon className="w-5 h-5 text-[#1e40af]" /> Current Tables
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 w-16 text-center">#</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Table Number</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                            No tables created yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        tables.map((t, index) => (
                          <TableRow key={t.id} className="h-14 hover:bg-zinc-50 transition-colors">
                            <TableCell className="px-6 text-center font-bold text-zinc-400 text-[13px]">{index + 1}</TableCell>
                            <TableCell className="px-6">
                              <span className="font-bold text-[15px] text-zinc-900 uppercase tracking-wide">{t.tableNumber}</span>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              {t.status === "Active" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide">
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
                                    <Edit className="mr-2 h-4 w-4" /> Edit Table
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
      </div>
    </div>
  );
}