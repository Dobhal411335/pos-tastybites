"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Loader2, MoreHorizontal, UserCheck, Mail, Phone, ShieldAlert, Edit2, CheckCircle, Key, Send, RefreshCw, Eye, EyeOff, Copy, Edit, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DeleteDialog from "@/components/common/DeleteDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeviceTokenOpen, setIsDeviceTokenOpen] = useState(false);
  
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [viewPassword, setViewPassword] = useState("");
  const [viewPasscode, setViewPasscode] = useState("");
  const [approveEmployeeId, setApproveEmployeeId] = useState("");
  const [approvePassword, setApprovePassword] = useState("");
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const [empRes, rolesRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/roles")
      ]);
      const empJson = await empRes.json();
      const rolesJson = await rolesRes.json();
      
      if (empJson.success) {
        setEmployees(empJson.data);
      }
      if (rolesJson.success) {
        setRoles(rolesJson.data);
      }
    } catch (err) {
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Employee status updated to ${nextStatus}`);
        fetchInitialData();
      } else {
        toast.error(json.message || "Failed to update status.");
      }
    } catch (err) {
      toast.error("Failed to update employee status.");
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Role updated successfully.");
        setEmployees(employees.map(emp => emp._id === id ? { ...emp, role: newRole } : emp));
      } else {
        toast.error(json.message || "Failed to update role.");
      }
    } catch (err) {
      toast.error("Failed to update role.");
    }
  };

  const handleDeleteUser = (id) => {
    setTimeout(() => {
      setEmployeeToDelete(id);
      setIsDeleteDialogOpen(true);
    }, 150);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      const res = await fetch(`/api/employees?id=${employeeToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Employee record deleted.");
        setEmployees(employees.filter((emp) => emp._id !== employeeToDelete));
      } else {
        toast.error(json.message || "Failed to delete employee.");
      }
    } catch (err) {
      toast.error("Failed to delete employee.");
    } finally {
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleApprove = async () => {
    if (!selectedEmployee) return;
    if (!approveEmployeeId.trim() || !approvePassword.trim()) {
      toast.error("Employee ID and password are required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: selectedEmployee._id,
          action: "approve",
          employeeId: approveEmployeeId.trim(),
          password: approvePassword.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Employee approved and credentials saved!");
        setIsApproveOpen(false);
        setApproveEmployeeId("");
        setApprovePassword("");
        fetchInitialData();
        handleOpenCredentials(json.data, json.data.plainPassword, json.data.passcode);
      } else {
        toast.error(json.message || "Approval failed");
      }
    } catch (err) {
      toast.error("An error occurred during approval");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegeneratePassword = async () => {
    if (!selectedEmployee) return;
    if (!regeneratePassword.trim()) {
      toast.error("Enter a new password.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: selectedEmployee._id,
          action: "regeneratePassword",
          password: regeneratePassword.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password updated successfully.");
        setIsRegenerateOpen(false);
        setRegeneratePassword("");
        fetchInitialData();
        handleOpenCredentials(json.data, json.data.plainPassword, json.data.passcode);
      } else {
        toast.error(json.message || "Failed to update password");
      }
    } catch (err) {
      toast.error("Error updating password");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateDeviceToken = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: selectedEmployee._id, action: "generateDeviceToken" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("New device token generated and sent via email.");
        setIsDeviceTokenOpen(false);
        fetchInitialData();
      } else {
        toast.error(json.message || "Failed to generate device token");
      }
    } catch (err) {
      toast.error("Error generating device token");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: selectedEmployee._id, action: "sendCredentials" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Credentials sent to employee!");
        setIsEmailOpen(false);
        fetchInitialData();
      } else {
        toast.error(json.message || "Failed to send credentials");
      }
    } catch (err) {
      toast.error("Error sending email");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCredentials = async (emp, knownPassword = null, knownPasscode = null) => {
    await new Promise(resolve => setTimeout(resolve, 150));

    setSelectedEmployee(emp);
    setViewPassword(knownPassword || "");
    setViewPasscode(knownPasscode || emp?.passcode || "");
    setShowPassword(false);
    setIsCredentialsOpen(true);

    if (knownPassword && knownPasscode !== null && knownPasscode !== undefined) return;

    try {
      const res = await fetch(`/api/employees/credentials?id=${emp._id}`);
      const json = await res.json();
      if (json.success) {
        if (!knownPassword) setViewPassword(json.data.password || "");
        setViewPasscode(json.data.passcode || knownPasscode || "");
      } else {
        toast.error(json.message || "Could not load credentials for viewing");
      }
    } catch (err) {
      toast.error("Failed to fetch credentials");
    }
  };

  const openApproveDialog = async (emp) => {
    setSelectedEmployee(emp);
    setApproveEmployeeId("");
    setApprovePassword("");
    setViewPasscode("");
    setIsApproveOpen(true);
    try {
      const res = await fetch(`/api/employees/credentials?id=${emp._id}`);
      const json = await res.json();
      if (json.success) setViewPasscode(json.data.passcode || "");
    } catch (err) {}
  };

  const copyToClipboard = (text, item) => {
    navigator.clipboard.writeText(text);
    toast.success(`${item} copied to clipboard!`);
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">
          
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
              <Button asChild className="h-10 px-4 font-bold text-white transition-transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2" style={{ backgroundColor: "#1e40af" }}>
                <Link href="/admin/employee/create">
                  + Add Employee
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center w-full gap-8">
            <div className="w-full">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#1e40af]" /> Staff Directory
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">ID / Username</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Employee Details</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Role</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Credentials</TableHead>
                        <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={index} className="h-16 border-b border-zinc-100">
                              <TableCell className="px-6">
                                <div className="space-y-2">
                                  <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" />
                                  <div className="h-3 w-16 bg-zinc-200 rounded animate-pulse" />
                                </div>
                              </TableCell>
                              <TableCell className="px-6">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-zinc-200 rounded-full animate-pulse" />
                                  <div className="space-y-2">
                                    <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
                                    <div className="h-3 w-40 bg-zinc-200 rounded animate-pulse" />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <div className="h-6 w-20 bg-zinc-200 rounded-md animate-pulse mx-auto" />
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <div className="h-6 w-16 bg-zinc-200 rounded-full animate-pulse mx-auto" />
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <div className="h-8 w-24 bg-zinc-200 rounded animate-pulse mx-auto" />
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <div className="flex justify-center">
                                  <div className="h-8 w-8 bg-zinc-200 rounded animate-pulse" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : employees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                              No employees found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          employees.map((emp) => (
                            <TableRow key={emp._id} className="h-16 hover:bg-zinc-50 transition-colors">
                              <TableCell className="px-6 py-3">
                                <div className="font-semibold text-zinc-700">{emp.employeeId || '-'}</div>
                                {emp.username && <div className="text-[12px] text-zinc-500 mt-1">@{emp.username}</div>}
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
                                <span className="text-[13px] font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-md inline-block min-w-25">
                                  {emp.role || 'Staff'}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                {emp.status === "Pending Approval" && <Badge className="bg-amber-100 text-amber-800 border-none px-3 py-1">Pending Approval</Badge>}
                                {emp.status === "Approved" && <Badge className="bg-blue-100 text-blue-800 border-none px-3 py-1">Approved</Badge>}
                                {emp.status === "Active" && <Badge className="bg-emerald-100 text-emerald-800 border-none px-3 py-1">Active</Badge>}
                                {emp.status === "Suspended" && <Badge className="bg-red-100 text-red-800 border-none px-3 py-1">Suspended</Badge>}
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                {emp.credentialGenerated ? (
                                  emp.credentialSent ? 
                                  <span className="text-[12px] font-bold text-emerald-600 flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Sent</span> :
                                  <span className="text-[12px] font-bold text-blue-600 flex items-center justify-center gap-1"><Key className="w-3.5 h-3.5"/> Generated</span>
                                ) : (
                                  <span className="text-[12px] font-bold text-zinc-400">Not Generated</span>
                                )}
                              </TableCell>
                              <TableCell className="px-6 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 bg-white">
                                    <DropdownMenuItem asChild className="text-[14px] font-medium cursor-pointer mb-1">
                                      <Link href={`/admin/employee/create?id=${emp._id}`} className="flex items-center w-full">
                                        <Edit className="mr-2 h-4 w-4" /> Edit Employee
                                      </Link>
                                    </DropdownMenuItem>
                                    {emp.status === "Pending Approval" && (
                                      <DropdownMenuItem className="text-[14px] font-medium text-[#1e40af] focus:bg-blue-50 cursor-pointer" onClick={() => { setTimeout(() => openApproveDialog(emp), 150); }}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve Employee
                                      </DropdownMenuItem>
                                    )}
                                    {emp.credentialGenerated && (
                                      <>
                                        <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onClick={() => handleOpenCredentials(emp)}>
                                          <Key className="mr-2 h-4 w-4" /> View Credentials
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onClick={() => {
                                          setSelectedEmployee(emp);
                                          setTimeout(async () => {
                                            setIsEmailOpen(true);
                                            try {
                                              const credRes = await fetch(`/api/employees/credentials?id=${emp._id}`);
                                              const credJson = await credRes.json();
                                              if (credJson.success) {
                                                setViewPasscode(credJson.data.passcode || "");
                                                setViewPassword(credJson.data.password || "");
                                              }
                                            } catch (err) {}
                                          }, 150);
                                        }}>
                                          <Send className="mr-2 h-4 w-4" /> Send Credentials
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-[14px] font-medium text-amber-600 focus:bg-amber-50 cursor-pointer" onClick={() => { setSelectedEmployee(emp); setRegeneratePassword(""); setTimeout(() => setIsRegenerateOpen(true), 150); }}>
                                          <RefreshCw className="mr-2 h-4 w-4" /> Set New Password
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onClick={() => { setSelectedEmployee(emp); setTimeout(() => setIsDeviceTokenOpen(true), 150); }}>
                                          <Smartphone className="mr-2 h-4 w-4" /> Generate Device Token
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <div className="border-t border-zinc-100 my-1"></div>
                                    {(emp.status === "Active" || emp.status === "Suspended") && (
                                      <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onClick={() => handleToggleStatus(emp._id, emp.status)}>
                                        <ShieldAlert className="mr-2 h-4 w-4" />
                                        {emp.status === "Active" ? "Suspend Employee" : "Activate Employee"}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="text-[14px] font-medium text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer" onClick={() => handleDeleteUser(emp._id)}>
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This action cannot be undone."
      />

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Approve Employee Account</DialogTitle>
            <DialogDescription>
              Enter the Employee ID and password this staff member will use to log in. Username is created automatically.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <span className="font-bold text-zinc-600">Name</span>
                <span className="col-span-3 font-semibold">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <span className="font-bold text-zinc-600">Role</span>
                <span className="col-span-3 font-semibold">{selectedEmployee.role}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Employee ID</label>
                <Input
                  value={approveEmployeeId}
                  onChange={(e) => setApproveEmployeeId(e.target.value)}
                  placeholder="e.g. EMP-0001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                <Input
                  type="text"
                  value={approvePassword}
                  onChange={(e) => setApprovePassword(e.target.value)}
                  placeholder="Set a password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Passcode</label>
                <Input readOnly value={viewPasscode || "Not set"} className="bg-zinc-50 font-mono" />
                <p className="text-xs text-zinc-500">Set when the employee was created. Used for quick clock-in on a registered device.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
            <Button disabled={actionLoading} onClick={handleApprove} className="bg-[#1e40af] text-white hover:bg-blue-800">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Save Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={isCredentialsOpen} onOpenChange={setIsCredentialsOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Employee Credentials</DialogTitle>
            <DialogDescription>
              These are the secure login credentials for {selectedEmployee?.firstName} {selectedEmployee?.lastName}.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Employee ID</label>
                  <div className="flex gap-2">
                    <Input readOnly value={selectedEmployee.employeeId || ""} className="bg-zinc-50 font-mono" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedEmployee.employeeId, "Employee ID")}>
                      <Copy className="h-4 w-4 text-zinc-600" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Password</label>
                  <div className="flex gap-2">
                    <Input readOnly type={showPassword ? "text" : "password"} value={viewPassword || "Loading..."} className="bg-zinc-50 font-mono" />
                    <Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-zinc-600" /> : <Eye className="h-4 w-4 text-zinc-600" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(viewPassword, "Password")}>
                      <Copy className="h-4 w-4 text-zinc-600" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Passcode</label>
                  <div className="flex gap-2">
                    <Input readOnly value={viewPasscode || "—"} className="bg-zinc-50 font-mono" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(viewPasscode, "Passcode")}>
                      <Copy className="h-4 w-4 text-zinc-600" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                <Button variant="outline" className="w-full font-bold" onClick={() => {
                  copyToClipboard(`Employee ID: ${selectedEmployee.employeeId}\nPassword: ${viewPassword}\nPasscode: ${viewPasscode || ""}`, "Credentials");
                }}>
                  Copy Employee ID, Password & Passcode
                </Button>
                <Button className="w-full bg-[#1e40af] text-white hover:bg-blue-800 font-bold" onClick={() => {
                  setIsCredentialsOpen(false);
                  setIsEmailOpen(true);
                }}>
                  <Send className="mr-2 h-4 w-4" /> Send Credentials by Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Send Login Credentials</DialogTitle>
            <DialogDescription>
              This will dispatch an automated email containing the login credentials.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4 py-4">
              <div className="bg-zinc-50 p-4 rounded-md border border-zinc-100 text-sm space-y-2">
                <div className="grid grid-cols-4"><span className="font-bold text-zinc-500">To:</span><span className="col-span-3">{selectedEmployee.email}</span></div>
                <div className="grid grid-cols-4"><span className="font-bold text-zinc-500">Subject:</span><span className="col-span-3">Your Restaurant Login Credentials</span></div>
                <div className="pt-2 border-t border-zinc-200 text-zinc-700">
                  <p>Hello {selectedEmployee.firstName},</p>
                  <p className="mt-2">Your employee account has been approved.</p>
                  <p className="mt-2 font-mono bg-white p-2 border border-zinc-200 rounded">Employee ID: {selectedEmployee.employeeId}<br/>Password: ********<br/>Passcode: {viewPasscode || "********"}</p>
                  
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailOpen(false)}>Cancel</Button>
            <Button disabled={actionLoading} onClick={handleSendEmail} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set New Password Dialog */}
      <Dialog open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {selectedEmployee?.firstName} {selectedEmployee?.lastName}. The passcode is unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New password</label>
            <Input
              type="text"
              value={regeneratePassword}
              onChange={(e) => setRegeneratePassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegenerateOpen(false)}>Cancel</Button>
            <Button disabled={actionLoading} onClick={handleRegeneratePassword} className="bg-amber-600 text-white hover:bg-amber-700">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Token Dialog */}
      <Dialog open={isDeviceTokenOpen} onOpenChange={setIsDeviceTokenOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Generate New Device Token</DialogTitle>
            <DialogDescription>
              This will retire the employee&apos;s current device token and generate a new one. An email with the new credentials and activation code will be sent to the employee.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <span className="font-bold text-zinc-600">Employee</span>
                <span className="col-span-3 font-semibold">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeviceTokenOpen(false)}>Cancel</Button>
            <Button disabled={actionLoading} onClick={handleGenerateDeviceToken} className="bg-amber-600 text-white hover:bg-amber-700">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}