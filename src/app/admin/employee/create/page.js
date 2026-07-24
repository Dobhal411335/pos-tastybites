"use client";

import React, { useState,useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PALETTE } from "@/utils/paletteeColor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CreateServerAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [role, setRole] = useState("Staff");
  const [employeeColor, setEmployeeColor] = useState("#4ade80");
  
  // Default Shift Assignment
  const [defaultShiftTemplate, setDefaultShiftTemplate] = useState("");
  const [templates, setTemplates] = useState([]);
  
  const [roles, setRoles] = useState([]);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    // Check if we are in edit mode
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    if (id) {
      setIsEditMode(true);
      setEditId(id);
    }

    // Fetch available roles and templates
    const fetchInitialData = async () => {
      try {
        const [rolesRes, templatesRes] = await Promise.all([
          fetch("/api/roles"),
          fetch("/api/employees/shifts?action=templates", { cache: "no-store" })
        ]);
        
        const rolesJson = await rolesRes.json();
        if (rolesJson.success) {
          setRoles(rolesJson.data);
          if (!rolesJson.data.find(r => r.name === role) && rolesJson.data.length > 0 && !id) {
            setRole(rolesJson.data[0].name);
          }
        }

        const templatesJson = await templatesRes.json();
        if (templatesJson.success) {
          setTemplates(templatesJson.data);
        }

        if (id) {
          const empRes = await fetch(`/api/employees?id=${id}`);
          const empJson = await empRes.json();
          if (empJson.success && empJson.data.length > 0) {
            const emp = empJson.data[0];
            setFirstName(emp.firstName || "");
            setLastName(emp.lastName || "");
            setEmail(emp.email || "");
            // Basic parsing of phone if it has country code
            const phoneParts = (emp.phoneNumber || "").split(" ");
            if (phoneParts.length > 1) {
              setCountryCode(phoneParts[0]);
              setPhoneNumber(phoneParts.slice(1).join(" "));
            } else {
              setPhoneNumber(emp.phoneNumber || "");
            }
            if (emp.role) setRole(emp.role);
            if (emp.employeeColor) setEmployeeColor(emp.employeeColor);
            if (emp.defaultShiftTemplate) setDefaultShiftTemplate(emp.defaultShiftTemplate);
          }
        }
      } catch (err) {
        toast.error("Failed to fetch data");
      }
    };
    fetchInitialData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim()) {
      toast.error("First Name, Last Name, Email, and Phone Number are required.");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode} ${phoneNumber.trim()}`;
      
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: fullPhone,
        role: role,
        employeeColor: employeeColor,
        defaultShiftTemplate: defaultShiftTemplate || null
      };

      if (!isEditMode) {
        payload.email = email.trim();
      } else {
        payload._id = editId;
        payload.action = "updateEmployee";
      }

      const res = await fetch("/api/employees", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || (isEditMode ? "Failed to update account" : "Failed to create account"));
      }

      toast.success(isEditMode ? "Employee updated successfully!" : "Employee account created successfully!");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setRole("Staff");
      setEmployeeColor("#4ade80");

      // Redirect to list page
      setTimeout(() => {
        router.push("/admin/employee");
      }, 2000);
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setRoles([...roles, json.data]);
        setRole(json.data.name);
        setIsAddRoleOpen(false);
        setNewRoleName("");
        toast.success("Role added successfully");
      } else {
        toast.error(json.message || "Failed to add role");
      }
    } catch (err) {
      toast.error("An error occurred while adding role");
    } finally {
      setAddingRole(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-200 mx-auto space-y-8 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                {isEditMode ? "Edit Employee" : "Create Employee"}
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                {isEditMode ? "Update staff member details and assignments." : "Add new staff members and assign their roles."}
              </p>
            </div>
            <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 hover:bg-zinc-50 border-zinc-200 text-zinc-700">
              <Link href="/admin/employee">
                <ArrowLeft className="w-5 h-5" />
                Back To List
              </Link>
            </Button>
          </div>

          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
              <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1e40af]" /> Employee Information
              </CardTitle>
              <CardDescription className="text-[14px]">Enter details for the new staff member.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="e.g. John"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 h-12 text-[15px] bg-white border-zinc-200 focus:ring-[#1e40af]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="e.g. Doe"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10 h-12 text-[15px] bg-white border-zinc-200 focus:ring-[#1e40af]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="email"
                        placeholder="e.g. john.doe@example.com"
                        required={!isEditMode}
                        disabled={isEditMode}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 text-[15px] bg-white border-zinc-200 focus:ring-[#1e40af]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex relative">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-32 text-xs h-12 rounded-r-none border-r-0 border-zinc-200 focus:ring-0 focus:border-zinc-200 bg-zinc-50 font-medium">
                          <SelectValue placeholder="+1" />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-60 overflow-y-auto">
                          <SelectItem value="+1">🇨🇦 +1 (Canada/US)</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44 (UK)</SelectItem>
                          <SelectItem value="+91">🇮🇳 +91 (India)</SelectItem>
                          <SelectItem value="+61">🇦🇺 +61 (Australia)</SelectItem>
                          <SelectItem value="+33">🇫🇷 +33 (France)</SelectItem>
                          <SelectItem value="+49">🇩🇪 +49 (Germany)</SelectItem>
                          <SelectItem value="+81">🇯🇵 +81 (Japan)</SelectItem>
                          <SelectItem value="+52">🇲🇽 +52 (Mexico)</SelectItem>
                          <SelectItem value="+971">🇦🇪 +971 (UAE)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        placeholder="e.g. 555-0199"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-12 text-[15px] bg-white rounded-l-none border-zinc-200 focus:ring-[#1e40af] flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className=" flex items-center w-full gap-5">
                  <div className="w-full">
                  <label className="text-[14px] font-semibold text-zinc-900 block">
                    Role <span className="text-red-500">*</span>
                  </label>

                  <div className="flex gap-2">
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-white">
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60 overflow-y-auto">
                        {roles.map(r => (
                          <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={() => setIsAddRoleOpen(true)}
                      className="h-12 w-12 shrink-0 bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200"
                    >
                      <UserPlus className="h-5 w-5" />
                    </Button>
                  </div>
                  </div>

                <div className="w-full gap-6">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900 block">
                      Employee Color
                    </label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={employeeColor}
                        onChange={(e) => setEmployeeColor(e.target.value)}
                        className="h-12 w-16 p-1 border-zinc-200 cursor-pointer"
                      />
                      <span className="text-[14px] text-zinc-600 font-medium font-mono">{employeeColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 flex justify-end gap-3">
                  {isEditMode && (
                    <Button type="button" variant="outline" className="w-full md:w-auto h-12 px-8 text-[15px] font-bold" asChild>
                      <Link href="/admin/employee">Cancel</Link>
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto h-12 px-8 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#1e40af" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{isEditMode ? "Updating..." : "Creating Account..."}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        <span>{isEditMode ? "Update User Account" : "Create User Account"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
        <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
          <DialogContent className="sm:max-w-106.25 bg-white">
            <DialogHeader>
              <DialogTitle>Add New Role</DialogTitle>
              <DialogDescription>
                Create a new custom role for your restaurant.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right text-[14px] font-semibold text-zinc-900">
                  Name
                </label>
                <Input
                  id="name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Bartender"
                  className="col-span-3 h-10 border-zinc-200 focus:ring-[#1e40af]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddRoleOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddRole} disabled={addingRole || !newRoleName.trim()} className="bg-[#1e40af] text-white hover:bg-[#1e40af]/90">
                {addingRole ? "Saving..." : "Save Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
