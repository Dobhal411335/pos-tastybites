"use client";

import React, { useState, useEffect } from "react";
import { 
  UserCircle, Clock, MapPin, Tablet, AlertCircle, 
  Phone, Mail, CalendarDays, Lock, LogOut, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function EmployeeProfilePage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/employee/auth/me");
        const json = await res.json();
        if (json.success && json.data) {
          const emp = json.data.employee;
          const shift = json.data.shift;
          
          setEmployee({
            id: emp.id || "N/A",
            firstName: emp.firstName || "",
            lastName: emp.lastName || "",
            email: emp.email || "N/A",
            phone: emp.phoneNumber || "N/A",
            role: emp.role || "Staff",
            joinDate: emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : "N/A",
            status: shift ? "active_shift" : "no_shift",
            shift: shift ? {
              start: new Date(shift.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
              end: "In Progress",
              section: shift.assignedFloor || "Main Dining Floor",
              deviceId: "Active Device", 
              tables: shift.assignedSection ? [shift.assignedSection] : ["All assigned tables"]
            } : null
          });
        }
      } catch (err) {
        toast.error("Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleClockOut = async () => {
    try {
      const res = await fetch("/api/employee/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Successfully clocked out.");
        router.push("/login");
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="h-32 bg-zinc-200 animate-pulse rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-zinc-200 animate-pulse rounded-2xl md:col-span-2"></div>
          <div className="h-48 bg-zinc-200 animate-pulse rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto pb-24">
      
      {/* 1. HEADER ROW */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-zinc-500 font-medium flex items-center gap-2 mt-1 uppercase tracking-wider text-sm">
              <span>{employee.role}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
              <span>{employee.id}</span>
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 shadow-none">
            <CheckCircle2 className="w-4 h-4 mr-1" /> On Shift
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Shift & Assignment */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Shift Details Card */}
          <Card className="rounded-2xl shadow-sm border-zinc-200 overflow-hidden">
            <div className="h-2 bg-orange-500"></div>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-zinc-800">
                <Clock className="w-5 h-5 text-zinc-500" />
                Current Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase mb-1">Time Range</p>
                  <p className="font-medium text-zinc-900">{employee.shift.start} - {employee.shift.end}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase mb-1">Section</p>
                  <p className="font-medium text-zinc-900">{employee.shift.section}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase mb-1">Device</p>
                  <p className="font-medium text-zinc-900">{employee.shift.deviceId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-zinc-900 text-lg">Shift Assignments</h3>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md">
                <Lock className="w-3.5 h-3.5" />
                Managed by Admin
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Card className="rounded-2xl shadow-sm border-zinc-200 bg-zinc-50/50">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-zinc-100">
                    <MapPin className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 mb-1">Assigned Zone</h4>
                    <p className="text-sm text-zinc-500 leading-snug">
                      You are responsible for the <span className="font-semibold text-zinc-700">{employee.shift.section}</span>.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm border-zinc-200 bg-zinc-50/50">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-zinc-100">
                    <Tablet className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 mb-1">Assigned Tables</h4>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {employee.shift.tables.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-zinc-200 text-zinc-700 font-semibold text-[11px] rounded uppercase">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Account & Stats */}
        <div className="space-y-6">
          {/* Account & Contact */}
          <Card className="rounded-2xl shadow-sm border-zinc-200">
            <CardHeader className="pb-3 border-b border-zinc-100 mb-4">
              <CardTitle className="text-base font-bold text-zinc-800">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-500">Joined</span>
                <span className="font-semibold text-zinc-900 ml-auto">{employee.joinDate}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-500">Phone</span>
                <span className="font-semibold text-zinc-900 ml-auto">{employee.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-500">Email</span>
                <span className="font-semibold text-zinc-900 ml-auto truncate max-w-30" title={employee.email}>
                  {employee.email}
                </span>
              </div>

              <div className="pt-6 space-y-3">
                <Button variant="outline" className="w-full justify-start h-11 rounded-xl text-zinc-600 font-semibold border-zinc-200 hover:bg-zinc-50">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Report an Issue
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleClockOut}
                  className="w-full h-11 rounded-xl font-bold shadow-none"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Clock Out
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
