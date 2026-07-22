"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Loader2, MoreHorizontal, UserCheck, Mail, Phone, ShieldAlert, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data);
      }
    } catch (err) {
      toast.error("Failed to load employee records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Terminated" : "Active";
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Employee status updated to ${nextStatus}`);
        fetchEmployees();
      } else {
        toast.error(json.message || "Failed to update status.");
      }
    } catch (err) {
      toast.error("Failed to update employee status.");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/employees?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Employee record deleted.");
        setEmployees(employees.filter((emp) => emp._id !== id));
      } else {
        toast.error(json.message || "Failed to delete employee.");
      }
    } catch (err) {
      toast.error("Failed to delete employee.");
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
                Employees
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Manage your staff directory, view roles, and handle access.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 hover:bg-zinc-50 border-zinc-200 text-zinc-700">
                <Link href="/admin/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild className="h-10 px-4 font-bold text-white transition-transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2" style={{ backgroundColor: "#1e40af" }}>
                <Link href="/admin/employee/create">
                  + Add Employee
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center w-full gap-8">
            {/* Users Table */}
            <div className="w-full">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#1e40af]" /> Staff Directory
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
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">ID</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Employee Details</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Role</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                              No employees found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          employees.map((emp) => (
                            <TableRow key={emp._id} className="h-16 hover:bg-zinc-50 transition-colors">
                              <TableCell className="px-6 py-3 font-semibold text-zinc-700">
                                {emp.employeeId}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[15px] text-zinc-900">{emp.firstName} {emp.lastName}</span>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[13px] text-zinc-500 font-medium flex items-center gap-1">
                                      <Mail className="w-3 h-3" /> {emp.email}
                                    </span>
                                    <span className="text-[13px] text-zinc-500 font-medium flex items-center gap-1">
                                      <Phone className="w-3 h-3" /> {emp.phoneNumber}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <span className="inline-flex items-center justify-center bg-zinc-100 text-zinc-700 px-3 py-1 rounded-md text-[13px] font-bold border border-zinc-200">
                                  {emp.role}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                {emp.status === "Active" && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-none px-3 py-1 text-[12px] font-semibold">
                                    Active
                                  </Badge>
                                )}
                                {emp.status === "On_Leave" && (
                                  <Badge className="bg-amber-50 text-amber-700 border-none px-3 py-1 text-[12px] font-semibold">
                                    On Leave
                                  </Badge>
                                )}
                                {emp.status === "Terminated" && (
                                  <Badge className="bg-red-50 text-red-700 border-none px-3 py-1 text-[12px] font-semibold">
                                    Terminated
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
                                  <DropdownMenuContent align="end" className="w-48 bg-white">
                                    <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onClick={() => handleToggleStatus(emp._id, emp.status)}>
                                      <ShieldAlert className="mr-2 h-4 w-4" />
                                      {emp.status === "Active" ? "Terminate Employee" : "Activate Employee"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                      onClick={() => handleDeleteUser(emp._id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Employee
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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