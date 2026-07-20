"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Filter, ShieldAlert, MoreVertical, 
  Settings2, Activity, CalendarClock, TabletSmartphone, KeyRound, 
  MapPin, CheckCircle2, Clock, Smartphone, ChevronRight
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Mock API Data
const MOCK_EMPLOYEES = [
  {
    id: "EMP-001",
    firstName: "Sarah",
    lastName: "Jenkins",
    email: "sarah.j@tastybites.com",
    phone: "555-0101",
    role: "Manager",
    status: "Active",
    shifts: [{ date: "2026-07-20", startTime: "08:00 AM", endTime: "04:00 PM", floor: "Main Dining" }],
    devices: [{ id: "DEV-001", name: "Front Desk iPad", lastLogin: new Date() }],
    sessions: [
      { loginTime: new Date(Date.now() - 3600000 * 2), logoutTime: null, duration: null, device: "Front Desk iPad", status: "Active" },
      { loginTime: new Date(Date.now() - 3600000 * 26), logoutTime: new Date(Date.now() - 3600000 * 18), duration: "8h 0m", device: "Front Desk iPad", status: "Terminated" }
    ],
    permissions: { processRefunds: true, voidItems: true, manageShifts: true, viewReports: true }
  },
  {
    id: "EMP-002",
    firstName: "Mike",
    lastName: "Rossi",
    email: "mike.r@tastybites.com",
    phone: "555-0102",
    role: "Bartender",
    status: "Active",
    shifts: [{ date: "2026-07-20", startTime: "04:00 PM", endTime: "12:00 AM", floor: "Bar Area" }],
    devices: [{ id: "DEV-002", name: "Bar Register POS", lastLogin: new Date(Date.now() - 86400000) }],
    sessions: [
      { loginTime: new Date(Date.now() - 3600000 * 28), logoutTime: new Date(Date.now() - 3600000 * 20), duration: "8h 0m", device: "Bar Register POS", status: "Terminated" }
    ],
    permissions: { processRefunds: false, voidItems: true, manageShifts: false, viewReports: false }
  },
  {
    id: "EMP-003",
    firstName: "Jessica",
    lastName: "Chen",
    email: "jessica.c@tastybites.com",
    phone: "555-0103",
    role: "Server",
    status: "On Leave",
    shifts: [],
    devices: [],
    sessions: [],
    permissions: { processRefunds: false, voidItems: false, manageShifts: false, viewReports: false }
  }
];

export default function StaffManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form for Add Employee
  const form = useForm({
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", role: "", status: "Active"
    }
  });

  // Load Mock Data
  useEffect(() => {
    const timer = setTimeout(() => {
      setEmployees(MOCK_EMPLOYEES);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAddEmployee = (data) => {
    const newEmployee = {
      id: `EMP-00${employees.length + 1}`,
      ...data,
      shifts: [], devices: [], sessions: [],
      permissions: { processRefunds: false, voidItems: false, manageShifts: false, viewReports: false }
    };
    setEmployees([...employees, newEmployee]);
    toast.success(`${data.firstName} ${data.lastName} added successfully.`);
    setIsAddDialogOpen(false);
    form.reset();
  };

  const filteredEmployees = employees.filter(emp => {
    const search = searchQuery.toLowerCase();
    const matchesSearch = emp.firstName.toLowerCase().includes(search) || 
                          emp.lastName.toLowerCase().includes(search) ||
                          emp.id.toLowerCase().includes(search);
    const matchesRole = roleFilter === "All" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case "Manager": return "bg-indigo-100 text-indigo-700";
      case "Bartender": return "bg-amber-100 text-amber-700";
      case "Server": return "bg-emerald-100 text-emerald-700";
      case "Chef": return "bg-orange-100 text-orange-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 lg:p-10 font-sans">
      <Toaster richColors />
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Portal</h1>
            <p className="text-slate-500 mt-1">Manage employees, shifts, permissions, and view active sessions.</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm font-semibold rounded-lg px-6">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Employee</DialogTitle>
                <DialogDescription>Create a new staff profile. You can configure their permissions later.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddEmployee)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" rules={{ required: true }} render={({ field }) => (
                      <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" rules={{ required: true }} render={({ field }) => (
                      <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" rules={{ required: true }} render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="role" rules={{ required: true }} render={({ field }) => (
                      <FormItem><FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Server">Server</SelectItem>
                            <SelectItem value="Bartender">Bartender</SelectItem>
                            <SelectItem value="Chef">Chef</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Add Employee</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dashboard Stats */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-xl bg-blue-50"><Activity className="w-6 h-6 text-blue-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Online Now</p><h3 className="text-2xl font-black text-slate-900">1</h3></div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-xl bg-emerald-50"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Today&apos;s Sessions</p><h3 className="text-2xl font-black text-slate-900">4</h3></div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-xl bg-indigo-50"><Clock className="w-6 h-6 text-indigo-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Avg Session Duration</p><h3 className="text-2xl font-black text-slate-900">7h 45m</h3></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Search by employee name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="Role" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Server">Server</SelectItem>
                <SelectItem value="Bartender">Bartender</SelectItem>
                <SelectItem value="Chef">Chef</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Employee List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="w-full h-20 rounded-xl" />)}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-20 text-center border border-dashed rounded-xl border-slate-300">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No employees found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map(emp => (
              <Sheet key={emp.id} open={selectedEmployee?.id === emp.id} onOpenChange={(open) => setSelectedEmployee(open ? emp : null)}>
                <SheetTrigger asChild>
                  <Card className="bg-white border-slate-200 hover:shadow-md transition-all cursor-pointer rounded-2xl group">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-700">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <Badge className={`${getRoleColor(emp.role)} border-none`}>{emp.role}</Badge>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{emp.firstName} {emp.lastName}</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-4">{emp.id}</p>
                      
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-sm font-medium text-slate-700">{emp.status}</span>
                        </div>
                        <span className="text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Profile <ChevronRight className="inline w-4 h-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </SheetTrigger>

                {/* Employee Details Drawer */}
                <SheetContent className="sm:max-w-xl w-[90vw] p-0 overflow-y-auto bg-slate-50">
                  {selectedEmployee && selectedEmployee.id === emp.id && (
                    <div className="flex flex-col h-full">
                      {/* Drawer Header */}
                      <div className="bg-white p-6 border-b border-slate-200 relative">
                        <div className="flex items-center gap-5">
                          <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-black">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-slate-900">{emp.firstName} {emp.lastName}</h2>
                            <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                              {emp.id} <span className="w-1 h-1 rounded-full bg-slate-300"/> {emp.role}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <Tabs defaultValue="profile" className="w-full">
                          <TabsList className="w-full bg-slate-200/50 p-1 mb-6">
                            <TabsTrigger value="profile" className="flex-1 rounded-sm">Profile</TabsTrigger>
                            <TabsTrigger value="permissions" className="flex-1 rounded-sm">Permissions</TabsTrigger>
                            <TabsTrigger value="sessions" className="flex-1 rounded-sm">Sessions</TabsTrigger>
                          </TabsList>

                          <TabsContent value="profile" className="space-y-6">
                            <section>
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Contact Information</h3>
                              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                                <div className="flex justify-between"><span className="text-slate-500 text-sm">Email</span><span className="font-semibold text-sm">{emp.email}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 text-sm">Phone</span><span className="font-semibold text-sm">{emp.phone}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 text-sm">Status</span><Badge variant="outline">{emp.status}</Badge></div>
                              </div>
                            </section>

                            <section>
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><CalendarClock className="w-4 h-4"/> Upcoming / Active Shift</h3>
                              {emp.shifts.length > 0 ? (
                                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                                  <div className="flex items-center gap-2 mb-2"><Badge className="bg-blue-600 hover:bg-blue-700">Scheduled</Badge></div>
                                  <p className="font-bold text-slate-900">{emp.shifts[0].date} • {emp.shifts[0].startTime} - {emp.shifts[0].endTime}</p>
                                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {emp.shifts[0].floor}</p>
                                </div>
                              ) : (
                                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-500 font-medium">No active or upcoming shifts assigned.</div>
                              )}
                            </section>
                          </TabsContent>

                          <TabsContent value="permissions" className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                  <Label className="text-sm font-bold">Process Refunds</Label>
                                  <p className="text-xs text-slate-500">Allow employee to issue cash/card refunds.</p>
                                </div>
                                <Switch checked={emp.permissions.processRefunds} />
                              </div>
                              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                  <Label className="text-sm font-bold">Void Items</Label>
                                  <p className="text-xs text-slate-500">Allow employee to void items from kitchen tickets.</p>
                                </div>
                                <Switch checked={emp.permissions.voidItems} />
                              </div>
                              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                  <Label className="text-sm font-bold">Manage Shifts</Label>
                                  <p className="text-xs text-slate-500">Allow employee to assign shifts to others.</p>
                                </div>
                                <Switch checked={emp.permissions.manageShifts} />
                              </div>
                              <div className="p-4 flex items-center justify-between bg-slate-50">
                                <div>
                                  <Label className="text-sm font-bold">View Financial Reports</Label>
                                  <p className="text-xs text-slate-500">Access to end-of-day revenue statistics.</p>
                                </div>
                                <Switch checked={emp.permissions.viewReports} />
                              </div>
                            </div>
                            <Button className="w-full bg-slate-900 hover:bg-slate-800">Save Permissions</Button>
                          </TabsContent>

                          <TabsContent value="sessions" className="space-y-6">
                            <section>
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Registered Devices Used</h3>
                              <div className="grid grid-cols-1 gap-3">
                                {emp.devices.map(d => (
                                  <div key={d.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                                    <TabletSmartphone className="w-5 h-5 text-slate-400" />
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                                      <p className="text-xs text-slate-500">Last login: {format(d.lastLogin, "MMM d")}</p>
                                    </div>
                                  </div>
                                ))}
                                {emp.devices.length === 0 && <p className="text-sm text-slate-500 italic">No devices used yet.</p>}
                              </div>
                            </section>
                            
                            <section>
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Session Logs</h3>
                              <div className="space-y-3">
                                {emp.sessions.map((s, i) => (
                                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <Badge variant={s.status === 'Active' ? 'default' : 'secondary'} className={s.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-none' : ''}>
                                        {s.status}
                                      </Badge>
                                      <span className="text-xs text-slate-500">{format(s.loginTime, "MMM d, yyyy")}</span>
                                    </div>
                                    <div className="space-y-1 text-sm mt-3">
                                      <div className="flex justify-between"><span className="text-slate-500">Login</span><span className="font-semibold">{format(s.loginTime, "h:mm a")}</span></div>
                                      {s.logoutTime && <div className="flex justify-between"><span className="text-slate-500">Logout</span><span className="font-semibold">{format(s.logoutTime, "h:mm a")}</span></div>}
                                      {s.duration && <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-semibold text-indigo-600">{s.duration}</span></div>}
                                      <div className="flex justify-between mt-2 pt-2 border-t border-slate-100"><span className="text-slate-500">Device</span><span className="font-semibold text-slate-700">{s.device}</span></div>
                                    </div>
                                  </div>
                                ))}
                                {emp.sessions.length === 0 && <p className="text-sm text-slate-500 italic text-center py-4 bg-white rounded-xl border border-slate-200">No session history available.</p>}
                              </div>
                            </section>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
