"use client";

import React, { useState,useEffect } from "react";
import { Trash2, Edit, Utensils, MoreHorizontal, Table as TableIcon, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeleteDialog from "@/components/common/DeleteDialog";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function CreateTablePage() {
  const [tableNumber, setTableNumber] = useState("");
  const [tables, setTables] = useState([]);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const fetchTables = async () => {
    try {
      const res = await fetch("/api/floor/tables");
      const json = await res.json();
      if (json.success) {
        setTables(json.data);
      }
    } catch (err) {
      toast.error("Failed to fetch tables");
    }
  };
  useEffect(() => {
    fetchTables();
  }, []);


  const handleSave = async (e) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      toast.error("Please enter a table number.");
      return;
    }
    
    try {
      if (isEditing) {
        const res = await fetch("/api/floor/tables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingId, tableNumber: tableNumber.trim() })
        });
        const json = await res.json();
        if (json.success) {
          setTables(tables.map(t => t._id === editingId ? { ...t, tableNumber: tableNumber.trim() } : t));
          setTableNumber("");
          setIsEditing(false);
          setEditingId(null);
          toast.success("Table updated successfully!");
        } else {
          toast.error(json.message || "Failed to update table");
        }
      } else {
        const res = await fetch("/api/floor/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableNumber: tableNumber.trim() })
        });
        const json = await res.json();
        if (json.success) {
          setTables([...tables, json.data]);
          setTableNumber("");
          toast.success(`Table ${json.data.tableNumber} created successfully!`);
        } else {
          toast.error(json.message || "Failed to create table");
        }
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleEditClick = (id) => {
    const table = tables.find((t) => t._id === id);
    if (table) {
      setIsEditing(true);
      setEditingId(id);
      setTableNumber(table.tableNumber);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setTableNumber("");
  };

  const handleDeleteClick = (id) => {
    setTableToDelete(id);
  };

  const confirmDelete = async () => {
    if (!tableToDelete) return;
    try {
      const res = await fetch(`/api/floor/tables?id=${tableToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setTables(tables.filter((t) => t._id !== tableToDelete));
        toast.success("Table deleted successfully.");
      } else {
        toast.error(json.message || "Failed to delete table");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setTableToDelete(null);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-250 mx-auto space-y-8 pb-16 font-sans">
          
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
                    <Utensils className="w-5 h-5 text-[#1e40af]" /> {isEditing ? "Edit Table" : "Add New Table"}
                  </CardTitle>
                  <CardDescription className="text-[14px]">
                    {isEditing ? "Modify the table identifier." : "Define a new table identifier."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSave} className="space-y-4">
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
                    <div className="flex gap-2 mt-4">
                      <Button
                        type="submit"
                        className="flex-1 h-11 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm"
                        style={{ backgroundColor: "#1e40af" }}
                      >
                        {isEditing ? "Save Changes" : "Create Table"}
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
                          <TableRow key={t._id || index} className="h-14 hover:bg-zinc-50 transition-colors">
                            <TableCell className="px-6 text-center font-bold text-zinc-400 text-[13px]">{index + 1}</TableCell>
                            <TableCell className="px-6">
                              <span className="font-bold text-[15px] text-zinc-900">{t.tableNumber}</span>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold px-3 py-1">
                                {t.status || "Available"}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6">
                              <div className="flex items-center justify-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 p-2 bg-white rounded-xl shadow-lg border border-zinc-100">
                                    <DropdownMenuItem className="text-[13px] font-semibold text-orange-600 focus:bg-orange-400 focus:text-white cursor-pointer p-2 rounded-md" onClick={() => handleEditClick(t._id)}>
                                      <Edit2 className="mr-2 h-4 w-4" /> Edit Table
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-[13px] font-semibold text-red-600 focus:bg-orange-500 focus:text-white cursor-pointer p-2 rounded-md" onClick={() => handleDeleteClick(t._id)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Table
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
        isOpen={!!tableToDelete} 
        onOpenChange={(isOpen) => { if (!isOpen) setTableToDelete(null); }} 
        onConfirm={confirmDelete} 
        title="Delete Table"
        description="Are you sure you want to delete this table? This action cannot be undone."
      />
    </div>
  );
}