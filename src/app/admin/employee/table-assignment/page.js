"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function TableAssignmentPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/employees/table-assignment");
      const json = await res.json();
      if (json.success) {
        setShifts(json.data);
      }
    } catch (err) {
      toast.error("Failed to load table assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Table Assignment
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                View tables assigned to employee shifts.
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

          <div className="flex flex-col items-center w-full gap-8">
            <div className="w-full">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-[#1e40af]" /> Shift Table Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {loading ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-zinc-50">
                        <TableRow>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Date</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Employee</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Assigned Tables</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shifts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                              No shift table assignments found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          shifts.map((shift) => (
                            <TableRow key={shift._id} className="h-16 hover:bg-zinc-50 transition-colors">
                              <TableCell className="px-6 py-3">
                                <span className="font-bold text-[15px] text-zinc-900 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-zinc-400" />
                                  {new Date(shift.date).toLocaleDateString()}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 py-3 font-semibold text-zinc-900">
                                {shift.employee?.firstName} {shift.employee?.lastName}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {shift.assignedTables && shift.assignedTables.length > 0 ? (
                                    shift.assignedTables.map((table, idx) => (
                                      <span key={idx} className="inline-flex bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[12px] font-bold border border-blue-200">
                                        Table {table.tableNumber}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[13px] text-zinc-400 italic">No tables assigned</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
