"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, Clock, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function EmployeeShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShifts = async () => {
    try {
      const res = await fetch("/api/employees/shifts");
      const json = await res.json();
      if (json.success) {
        setShifts(json.data);
      }
    } catch (err) {
      toast.error("Failed to load shifts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleDeleteShift = async (id) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    try {
      const res = await fetch(`/api/employees/shifts?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Shift deleted successfully.");
        setShifts(shifts.filter((s) => s._id !== id));
      } else {
        toast.error(json.message || "Failed to delete shift.");
      }
    } catch (err) {
      toast.error("Failed to delete shift.");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Shifts & Scheduling
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                View and manage employee schedules, floors, and time tracking.
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
                    <CalendarDays className="w-5 h-5 text-[#1e40af]" /> Schedule Overview
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
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Time</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shifts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                              No shifts found.
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
                              <TableCell className="px-6 py-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[15px] text-zinc-900">
                                    {shift.employee?.firstName} {shift.employee?.lastName}
                                  </span>
                                  <span className="text-[13px] text-zinc-500 font-medium">
                                    {shift.employee?.role}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <span className="text-[14px] text-zinc-700 font-medium flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-zinc-400" />
                                  {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {" - "}
                                  {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD"}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <Badge className="bg-zinc-100 text-zinc-700 border-none px-3 py-1 text-[12px] font-semibold">
                                  {shift.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteShift(shift._id)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                  title="Delete Shift"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
