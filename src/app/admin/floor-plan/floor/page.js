"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Edit, LayoutGrid, MoreHorizontal, Check, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { useRouter } from "next/navigation";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function CreateFloorPage() {
  const router = useRouter();
  const [floorName, setFloorName] = useState("");
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floorToDelete, setFloorToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchFloors = async () => {
    try {
      const res = await fetch("/api/floor");
      const json = await res.json();
      if (json.success) {
        setFloors(json.data);
      }
    } catch (err) {
      toast.error("Failed to fetch floors");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchFloors();
  }, []);


  const handleSave = async (e) => {
    e.preventDefault();
    if (!floorName.trim()) return;

    try {
      if (isEditing) {
        const res = await fetch("/api/floor", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingId, name: floorName.trim() })
        });
        const json = await res.json();

        if (json.success) {
          setFloors(floors.map(f => f.id === editingId ? { ...f, floorName: floorName.trim() } : f));
          setFloorName("");
          setIsEditing(false);
          setEditingId(null);
          toast.success("Floor renamed successfully.");
        } else {
          toast.error(json.message || "Failed to rename floor");
        }
      } else {
        const res = await fetch("/api/floor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: floorName.trim() })
        });
        const json = await res.json();

        if (json.success) {
          setFloors([...floors, { id: json.data._id, floorName: json.data.name, tableCount: 0 }]);
          setFloorName("");
          toast.success("Floor created successfully.");
        } else {
          toast.error(json.message || "Failed to create floor");
        }
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleRenameClick = (id) => {
    const floor = floors.find((f) => f.id === id);
    if (floor) {
      setIsEditing(true);
      setEditingId(id);
      setFloorName(floor.floorName);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setFloorName("");
  };

  const handleDeleteClick = (id) => {
    setFloorToDelete(id);
  };

  const confirmDelete = async () => {
    if (!floorToDelete) return;
    try {
      const res = await fetch(`/api/floor?id=${floorToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setFloors(floors.filter(f => f.id !== floorToDelete));
        toast.success("Floor deleted successfully.");
      } else {
        toast.error(json.message || "Failed to delete floor");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setFloorToDelete(null);
    }
  };

  const handleEdit = (id) => {
    router.push(`/admin/floor-plan/floor/${id}`);
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-250 mx-auto space-y-8 pb-16 font-sans">

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
                    <Plus className="w-5 h-5 text-[#1e40af]" /> {isEditing ? "Rename Floor" : "Add New Floor"}
                  </CardTitle>
                  <CardDescription className="text-[14px]">
                    {isEditing ? "Modify the name of this floor." : "Define a new physical space or dining area."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSave} className="space-y-4">
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
                    <div className="flex gap-2 mt-4">
                      <Button
                        type="submit"
                        className="flex-1 h-11 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm"
                        style={{ backgroundColor: "#1e40af" }}
                      >
                        {isEditing ? "Save Changes" : "Create Floor"}
                      </Button>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-11 text-[15px] font-bold"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
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
                                  className="h-9 px-3 text-white bg-orange-500 hover:bg-orange-600 hover:text-white"
                                >
                                  <LayoutGrid className="mr-2 h-4 w-4" />
                                  Edit Layout
                                </Button>
                                <div className="flex items-center justify-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0 text-white hover:text-zinc-600 bg-orange-500 hover:bg-orange-600">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 p-2 bg-white rounded-xl shadow-lg border border-zinc-100">
                                      <DropdownMenuItem className="text-[13px] font-semibold text-orange-600 focus:bg-orange-400 focus:text-white cursor-pointer p-2 rounded-md" onClick={() => handleRenameClick(f.id)}>
                                        <Edit2 className="mr-2 h-4 w-4" /> Rename Floor
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-[13px] font-semibold text-red-600 focus:bg-orange-500 focus:text-white cursor-pointer p-2 rounded-md" onClick={() => handleDeleteClick(f.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Floor
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
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

      <DeleteDialog
        isOpen={!!floorToDelete}
        onOpenChange={(isOpen) => { if (!isOpen) setFloorToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Floor"
        description="Are you sure you want to delete this floor? All assigned tables will be unassigned."
      />
    </div>
  );
}