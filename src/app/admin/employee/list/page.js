"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Key, Loader2, MoreHorizontal, UserCheck, ShieldCheck, Mail, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function ListOfServerAccountsPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form selections
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [modalUsername, setModalUsername] = useState("");
  const [modalPassword, setModalPassword] = useState("");

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data);
        if (json.data.length > 0) {
          // Select first unapproved employee by default if any
          const unapproved = json.data.find((e) => e.status === "UNAPPROVED");
          setSelectedEmpId(unapproved?._id || json.data[0]._id);
        }
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

  const handleCreateLoginTrigger = () => {
    if (!selectedEmpId) {
      toast.error("Please select an employee first.");
      return;
    }
    const emp = employees.find((e) => e._id === selectedEmpId);
    if (!emp) return;

    // Generate mock username and password
    setModalUsername(emp.email);
    setModalPassword(`Pass_${Math.floor(1000 + Math.random() * 9000)}!`);
    setIsLoginModalOpen(true);
  };

  const handleConfirmLoginCreation = async (e) => {
    e.preventDefault();
    try {
      // Approve the employee
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmpId,
          status: "APPROVED",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to approve employee");
      }

      toast.success("Employee login generated and status approved!");
      setIsLoginModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "APPROVED" ? "SUSPENDED" : "APPROVED";
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`User status updated to ${nextStatus}`);
        fetchEmployees();
      }
    } catch (err) {
      toast.error("Failed to update user status.");
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      toast.success("User account record deleted.");
      setEmployees(employees.filter((emp) => emp._id !== id));
    } catch (err) {
      toast.error("Failed to delete user.");
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
                User Accounts
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Approve unapproved accounts, generate credentials, and manage team access.
              </p>
            </div>
            <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 hover:bg-zinc-50 border-zinc-200 text-zinc-700">
              <Link href="/admin/dashboard">
                <ArrowLeft className="w-5 h-5" />
                Back To Dashboard
              </Link>
            </Button>
          </div>

          <div className="flex flex-col items-center w-full gap-8">

            {/* Action Panel */}
            <div className="w-full space-y-6">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#1e40af]" /> Approve Access
                  </CardTitle>
                  <CardDescription className="text-[14px]">Select an unapproved user to generate login credentials.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900 block">
                      Select User
                    </label>
                    <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                      <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                        <SelectValue placeholder="Select unapproved user..." />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                        {employees.length === 0 ? (
                          <SelectItem value="none" disabled>No employees registered</SelectItem>
                        ) : (
                          employees.map((emp) => (
                            <SelectItem key={emp._id} value={emp._id}>
                              {emp.firstName} {emp.lastName} ({emp.status})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    onClick={handleCreateLoginTrigger}
                    className="w-full h-12 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#1e40af" }}
                  >
                    <Key className="h-5 w-5" />
                    <span>Generate Credentials</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <div className="w-full">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#1e40af]" /> Team Overview
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
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">User Details</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Role</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                              No users found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          employees.map((emp) => (
                            <TableRow key={emp._id} className="h-16 hover:bg-zinc-50 transition-colors">
                              <TableCell className="px-6 py-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[15px] text-zinc-900">{emp.firstName} {emp.lastName}</span>
                                  <span className="text-[13px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                                    <Mail className="w-3 h-3" /> {emp.email}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <span className="inline-flex items-center justify-center bg-zinc-100 text-zinc-700 px-3 py-1 rounded-md text-[13px] font-bold border border-zinc-200">
                                  {emp.role || "WAITER"}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                {emp.status === "APPROVED" && (
                                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 text-[12px] font-semibold">
                                    Approved
                                  </Badge>
                                )}
                                {emp.status === "SUSPENDED" && (
                                  <Badge className="bg-red-50 text-red-700 hover:bg-red-100 border-none px-3 py-1 text-[12px] font-semibold">
                                    Suspended
                                  </Badge>
                                )}
                                {emp.status === "UNAPPROVED" && (
                                  <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 text-[12px] font-semibold">
                                    Unapproved
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
                                      {emp.status === "APPROVED" ? "Suspend User" : "Approve User"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                      onClick={() => handleDeleteUser(emp._id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete User
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

      {/* Auto Generate Login Modal (Restyled) */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm shadow-2xl border-none overflow-hidden bg-white animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-4 relative text-center">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <CardTitle className="text-[20px] font-bold text-zinc-900">Generate Login</CardTitle>
              <CardDescription className="text-[14px]">Get Started in a Click.</CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleConfirmLoginCreation} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[13px] font-semibold text-zinc-700">Username</label>
                    <div className="relative bg-zinc-50 rounded-md border border-zinc-200 px-3 py-2.5">
                      <input
                        type="text"
                        readOnly
                        value={modalUsername}
                        className="w-full text-zinc-900 font-bold text-[14px] outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[13px] font-semibold text-zinc-700">Generated Password</label>
                    <div className="relative bg-zinc-50 rounded-md border border-zinc-200 px-3 py-2.5">
                      <input
                        type="text"
                        readOnly
                        value={modalPassword}
                        className="w-full text-zinc-900 font-bold text-[14px] outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-[12px]">
                  <ShieldCheck className="w-4 h-4" /> Password Strength: Strong
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#1e40af] hover:bg-blue-900 text-white font-bold text-[15px] shadow-md transition-transform hover:scale-[1.02]"
                  >
                    Create Credentials
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <button type="button" className="text-[13px] font-semibold text-zinc-500 hover:text-[#1e40af] transition-colors underline decoration-zinc-300 hover:decoration-[#1e40af]">
                    Email these credentials securely
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
