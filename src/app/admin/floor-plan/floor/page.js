"use client";

import React, { useState } from "react";
import { Trash2, Edit, LayoutGrid, MoreHorizontal, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { useRouter } from "next/navigation";

export default function CreateFloorPage() {
  const router = useRouter();
  const [floorName, setFloorName] = useState("");
  const [floors, setFloors] = useState([
    { id: "f1", floorName: "Ground Floor", tableCount: 12 },
    { id: "f2", floorName: "Patio", tableCount: 5 },
  ]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!floorName.trim()) return;
    setFloors([...floors, { id: `f${Date.now()}`, floorName: floorName.trim(), tableCount: 0 }]);
    setFloorName("");
    toast.success("Floor created successfully.");
  };

  const handleDelete = (id) => {
    setFloors(floors.filter((f) => f.id !== id));
    toast.success("Floor deleted successfully.");
  };

  const handleEdit = (id) => {
    router.push(`/admin/floor-plan/floor/${id}`);
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
                Restaurant Floors
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Create and manage different floors and areas of your restaurant.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center w-full gap-8">

            {/* Form Section */}
            <div className="w-full space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#1e40af]" /> Add New Floor
                  </CardTitle>
                  <CardDescription className="text-[14px]">Define a new physical space or dining area.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Floor Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Ground Floor, Terrace, VIP Lounge..."
                        value={floorName}
                        onChange={(e) => setFloorName(e.target.value)}
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#1e40af]"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm mt-4"
                      style={{ backgroundColor: "#1e40af" }}
                    >
                      Create Floor
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
                    <LayoutGrid className="w-5 h-5 text-[#1e40af]" /> Active Floors
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 w-16 text-center">#</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Floor Name</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Tables Assigned</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {floors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                            No floors created yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        floors.map((f, index) => (
                          <TableRow key={f.id} className="h-14 hover:bg-zinc-50 transition-colors">
                            <TableCell className="px-6 text-center font-bold text-zinc-400 text-[13px]">{index + 1}</TableCell>
                            <TableCell className="px-6">
                              <span className="font-bold text-[15px] text-zinc-900">{f.floorName}</span>
                            </TableCell>
                            <TableCell className="px-6 text-center text-[14px] text-zinc-600 font-medium">
                              {f.tableCount} Tables
                            </TableCell>
                            <TableCell className="px-6">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(f.id)}
                                  className="h-9 px-3 text-white bg-orange-500 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <LayoutGrid className="mr-2 h-4 w-4" />
                                  Edit Layout
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(f.id)}
                                  className="h-9 px-3 text-white bg-red-500 hover:bg-red-600 hover:text-white"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
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
