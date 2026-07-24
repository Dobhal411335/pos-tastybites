"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, LayoutGrid, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function TableAssignmentPage() {
  const [employees, setEmployees] = useState([]);
  const [floors, setFloors] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignments, setAssignments] = useState([]); // [{ id, floorId, tableIds: [] }]
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, floorsRes, tablesRes] = await Promise.all([
        fetch("/api/employees/floor-assignment"),
        fetch("/api/floor"),
        fetch("/api/floor/tables")
      ]);

      const empJson = await empRes.json();
      const floorsJson = await floorsRes.json();
      const tablesJson = await tablesRes.json();

      if (empJson.success) setEmployees(empJson.data);
      if (floorsJson.success) setFloors(floorsJson.data);
      if (tablesJson.success) setTables(tablesJson.data);
    } catch (err) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (employee) => {
    setSelectedEmployee(employee);

    // Group existing assignments by floor
    const grouped = {};
    if (employee.assignedTables && employee.assignedTables.length > 0) {
      employee.assignedTables.forEach(t => {
        const fId = t.floor?._id || t.floor;
        if (fId) {
          if (!grouped[fId]) grouped[fId] = [];
          grouped[fId].push(t._id);
        }
      });
    }

    const initialAssignments = Object.keys(grouped).map(fId => ({
      id: Math.random().toString(36).substring(7),
      floorId: fId,
      tableIds: grouped[fId]
    }));

    if (initialAssignments.length === 0) {
      initialAssignments.push({ id: Math.random().toString(36).substring(7), floorId: "", tableIds: [] });
    }

    setAssignments(initialAssignments);
    setIsDialogOpen(true);
  };

  const handleAddSection = () => {
    setAssignments([...assignments, { id: Math.random().toString(36).substring(7), floorId: "", tableIds: [] }]);
  };

  const handleRemoveSection = (id) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  const handleFloorChange = (id, floorId) => {
    setAssignments(assignments.map(a =>
      a.id === id ? { ...a, floorId, tableIds: [] } : a
    ));
  };

  const toggleTable = (sectionId, tableId) => {
    setAssignments(assignments.map(a => {
      if (a.id === sectionId) {
        const isSelected = a.tableIds.includes(tableId);
        return {
          ...a,
          tableIds: isSelected
            ? a.tableIds.filter(t => t !== tableId)
            : [...a.tableIds, tableId]
        };
      }
      return a;
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Flatten all tableIds
      const allTableIds = assignments.flatMap(a => a.tableIds);
      // Remove duplicates just in case
      const uniqueTableIds = [...new Set(allTableIds)];

      const res = await fetch("/api/employees/floor-assignment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee._id,
          assignedTables: uniqueTableIds
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Assignments updated successfully");
        setIsDialogOpen(false);
        fetchData(); // Refresh list
      } else {
        toast.error(json.message || "Failed to update assignments");
      }
    } catch (err) {
      toast.error("Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Table Assignment
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Assign floors and tables to your staff.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 hover:bg-zinc-50 border-zinc-200 text-zinc-700">
                <Link href="/admin/employee">
                  <ArrowLeft className="w-5 h-5" />
                  Back to Staff
                </Link>
              </Button>
            </div>
          </div>

          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
              <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-[#1e40af]" /> Employee Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" />
                </div>
              ) : (
                <UITable>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Employee</TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Role</TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Assigned Tables</TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                          No employees found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp) => {
                        // Group tables by floor for display
                        const displayGroups = {};
                        if (emp.assignedTables) {
                          emp.assignedTables.forEach(t => {
                            const fName = t.floor?.name || "Unknown Floor";
                            if (!displayGroups[fName]) displayGroups[fName] = [];
                            displayGroups[fName].push(t.tableNumber);
                          });
                        }

                        return (
                          <TableRow key={emp._id} className="hover:bg-zinc-50 transition-colors">
                            <TableCell className="px-6 py-4 font-semibold text-zinc-900">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: emp.employeeColor || '#ccc' }}>
                                  {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                                </div>
                                {emp.firstName} {emp.lastName}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Badge variant="outline" className="text-zinc-600 font-semibold">{emp.role}</Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex flex-col gap-2">
                                {Object.keys(displayGroups).length > 0 ? (
                                  Object.keys(displayGroups).map((floorName, idx) => (
                                    <div key={idx} className="flex flex-wrap items-center gap-2">
                                      <span className="text-[12px] font-bold text-zinc-500 uppercase">{floorName}:</span>
                                      {displayGroups[floorName].map((tNum, i) => (
                                        <Badge key={i} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-none">
                                          T{tNum}
                                        </Badge>
                                      ))}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[13px] text-zinc-400 italic">No assignments</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                                onClick={() => handleOpenDialog(emp)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Assign Tables
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </UITable>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-150 bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Assign Floors & Tables - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {assignments.map((section, idx) => {
              const floorTables = tables.filter(t => t.floor === section.floorId || (t.floor?._id && t.floor._id === section.floorId));
              return (
                <div key={section.id} className="p-4 border border-zinc-200 rounded-xl bg-zinc-50 space-y-4 relative">
                  {assignments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRemoveSection(section.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  <div>
                    <label className="text-[13px] font-bold text-zinc-700 mb-1.5 block uppercase tracking-wide">Select Floor</label>
                    <Select value={section.floorId} onValueChange={(val) => handleFloorChange(section.id, val)}>
                      <SelectTrigger className="w-full sm:w-62.5 bg-white">
                        <SelectValue placeholder="Choose a floor" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60 overflow-y-auto">
                        {floors.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.floorName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {section.floorId && (
                    <div>
                      <label className="text-[13px] font-bold text-zinc-700 mb-2 block uppercase tracking-wide">Select Tables (Multiple)</label>
                      {floorTables.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No tables found on this floor.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {floorTables.map(t => {
                            const isSelected = section.tableIds.includes(t._id);
                            return (
                              <Badge
                                key={t._id}
                                variant={isSelected ? "default" : "outline"}
                                className={`cursor-pointer transition-colors px-3 py-1 text-sm shadow-none ${isSelected
                                  ? 'bg-[#F97316] hover:bg-[#F97316]/90 text-white border-transparent'
                                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                                  }`}
                                onClick={() => toggleTable(section.id, t._id)}
                              >
                                Table {t.tableNumber}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              variant="outline"
              className="w-full border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50 gap-2 font-semibold"
              onClick={handleAddSection}
            >
              <Plus className="w-4 h-4" />
              Add Another Floor Assignment
            </Button>
          </div>

          <DialogFooter className="border-t border-zinc-100 pt-4">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-semibold">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#F97316] hover:bg-[#ea580c] text-white font-bold px-6">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
