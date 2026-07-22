"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PALETTE } from "@/utils/paletteeColor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CreateServerAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState("Staff");
  const [employeeColor, setEmployeeColor] = useState("#4ade80");
  const [assignedFloor, setAssignedFloor] = useState("");
  const [assignedTables, setAssignedTables] = useState([]);
  
  const [floors, setFloors] = useState([]);
  const [floorTables, setFloorTables] = useState([]);

  React.useEffect(() => {
    // Fetch available floors
    const fetchFloors = async () => {
      try {
        const res = await fetch("/api/floor");
        const json = await res.json();
        if (json.success) setFloors(json.data);
      } catch (err) {
        toast.error("Failed to fetch floors");
      }
    };
    fetchFloors();
  }, []);

  React.useEffect(() => {
    // Fetch tables when a floor is selected
    const fetchTables = async () => {
      if (!assignedFloor) {
        setFloorTables([]);
        setAssignedTables([]);
        return;
      }
      try {
        const res = await fetch(`/api/floor/tables?floorId=${assignedFloor}`);
        const json = await res.json();
        if (json.success) setFloorTables(json.data);
      } catch (err) {
        toast.error("Failed to fetch tables for floor");
      }
    };
    fetchTables();
  }, [assignedFloor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim()) {
      toast.error("First Name, Last Name, Email, and Phone Number are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          role: role,
          employeeColor: employeeColor,
          assignedFloor: assignedFloor || null,
          assignedTables: assignedTables
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create account");
      }

      toast.success("Employee account created successfully!");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setRole("Staff");
      setEmployeeColor("#4ade80");
      setAssignedFloor("");
      setAssignedTables([]);

      // Redirect to list page
      setTimeout(() => {
        router.push("/admin/employee");
      }, 1000);
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
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
                Create Employee
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Add new staff members and assign their roles.
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
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input
                        type="tel"
                        placeholder="e.g. +1 555-0199"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10 h-12 text-[15px] bg-white border-zinc-200 focus:ring-[#1e40af]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900 block">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af]">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900 block">
                      Assigned Floor
                    </label>
                    <Select value={assignedFloor} onValueChange={(val) => { setAssignedFloor(val); setAssignedTables([]); }}>
                      <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af]">
                        <SelectValue placeholder="Select a floor..." />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: PALETTE.canvas }}>
                        {floors.map(f => (
                          <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

                {assignedFloor && (
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-zinc-900 block">
                      Assign Tables on Floor
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {floorTables.length === 0 ? (
                        <p className="text-[13px] text-zinc-500 col-span-full">No tables found on this floor.</p>
                      ) : (
                        floorTables.map(t => {
                          const isSelected = assignedTables.includes(t._id);
                          return (
                            <button
                              key={t._id}
                              type="button"
                              onClick={() => {
                                setAssignedTables(prev => 
                                  prev.includes(t._id) ? prev.filter(id => id !== t._id) : [...prev, t._id]
                                );
                              }}
                              className={`h-10 text-[13px] font-bold rounded-lg transition-colors border ${
                                isSelected 
                                  ? 'bg-[#1e40af] text-white border-[#1e40af]' 
                                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              {t.tableNumber}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto h-12 px-8 text-[15px] font-bold text-white transition-transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#1e40af" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        <span>Create User Account</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
