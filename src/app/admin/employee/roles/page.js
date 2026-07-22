"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Shield, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";

export default function EmployeeRolesPage() {
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Dialog State
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  // Edit Dialog State
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const fetchInitialData = useCallback(async () => {
    try {
      const [rolesRes, empRes] = await Promise.all([
        fetch("/api/employees/roles"),
        fetch("/api/employees")
      ]);
      const rolesJson = await rolesRes.json();
      const empJson = await empRes.json();
      
      if (rolesJson.success) setRoles(rolesJson.data);
      if (empJson.success) setEmployees(empJson.data);
    } catch (err) {
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    setSavingRole(true);
    try {
      const res = await fetch("/api/employees/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Role added successfully.");
        setRoles([...roles, json.data]);
        setIsAddRoleOpen(false);
        setNewRoleName("");
      } else {
        toast.error(json.message || "Failed to add role.");
      }
    } catch (err) {
      toast.error("Failed to add role.");
    } finally {
      setSavingRole(false);
    }
  };

  const handleEditRole = async () => {
    if (!editRoleName.trim() || !roleToEdit) return;
    setSavingRole(true);
    try {
      const res = await fetch("/api/employees/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: roleToEdit._id, name: editRoleName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Role updated successfully.");
        setRoles(roles.map(r => r._id === roleToEdit._id ? json.data : r));
        setIsEditRoleOpen(false);
      } else {
        toast.error(json.message || "Failed to update role.");
      }
    } catch (err) {
      toast.error("Failed to update role.");
    } finally {
      setSavingRole(false);
    }
  };

  const triggerDelete = (role) => {
    const assignedCount = employees.filter(emp => emp.role === role.name).length;
    if (assignedCount > 0) {
      toast.error(`Cannot delete role. ${assignedCount} staff member(s) are assigned to it.`);
      return;
    }
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      const res = await fetch(`/api/employees/roles?id=${roleToDelete._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Role deleted successfully.");
        setRoles(roles.filter((r) => r._id !== roleToDelete._id));
      } else {
        toast.error(json.message || "Failed to delete role.");
      }
    } catch (err) {
      toast.error("Failed to delete role.");
    } finally {
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const getAssignedCount = (roleName) => {
    return employees.filter(emp => emp.role === roleName).length;
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Roles Configuration
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Manage system roles and see how many staff are assigned to each.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 hover:bg-zinc-50 border-zinc-200 text-zinc-700">
                <Link href="/admin/employee/lists">
                  <ArrowLeft className="w-5 h-5" />
                  Back to Staff
                </Link>
              </Button>
              <Button 
                className="h-10 px-4 font-semibold text-[15px] gap-2 bg-[#1e40af] hover:bg-[#1e40af]/90 text-white"
                onClick={() => setIsAddRoleOpen(true)}
              >
                <Plus className="w-5 h-5" />
                Add Role
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center w-full gap-8">
            <div className="w-full">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#1e40af]" /> System Roles
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
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 w-1/2">Role Name</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Assigned Staff</TableHead>
                          <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                              No roles found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          roles.map((role) => {
                            const assigned = getAssignedCount(role.name);
                            return (
                              <TableRow key={role._id} className="h-16 hover:bg-zinc-50 transition-colors">
                                <TableCell className="px-6 py-3">
                                  <span className="font-bold text-[15px] text-zinc-900">{role.name}</span>
                                </TableCell>
                                <TableCell className="px-6 py-3">
                                  <span className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-3 py-1 rounded-md text-[13px] font-bold border border-zinc-200">
                                    👥 {assigned} Staff {assigned === 1 ? 'Member' : 'Members'}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setRoleToEdit(role);
                                        setEditRoleName(role.name);
                                        setIsEditRoleOpen(true);
                                      }}
                                      className="h-8 w-8 text-orange-500 hover:text-orange-700 hover:bg-orange-50 cursor-pointer"
                                      title="Edit Role Name"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => triggerDelete(role)}
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                      title="Delete Role"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
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

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent className="sm:max-w-106.25 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New Role</DialogTitle>
            <DialogDescription>
              Create a new custom role for your restaurant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-[14px] font-semibold text-zinc-900">
                Role Name
              </label>
              <Input
                id="name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Bartender"
                className="h-11 border-zinc-200 focus-visible:ring-[#1e40af]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddRole();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoleOpen(false)} className="h-10 border-zinc-200 text-zinc-700">
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={savingRole || !newRoleName.trim()} className="h-10 bg-[#1e40af] text-white hover:bg-[#1e40af]/90">
              {savingRole ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="sm:max-w-106.25 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Role</DialogTitle>
            <DialogDescription>
              Update the name of this role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="edit-name" className="text-[14px] font-semibold text-zinc-900">
                Role Name
              </label>
              <Input
                id="edit-name"
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                className="h-11 border-zinc-200 focus-visible:ring-[#1e40af]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditRole();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoleOpen(false)} className="h-10 border-zinc-200 text-zinc-700">
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={savingRole || !editRoleName.trim() || editRoleName === roleToEdit?.name} className="h-10 bg-[#1e40af] text-white hover:bg-[#1e40af]/90">
              {savingRole ? "Saving..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Role"
        description="Are you sure you want to delete this role? This action cannot be undone."
      />
    </div>
  );
}
