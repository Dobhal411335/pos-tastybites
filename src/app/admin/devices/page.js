"use client";

import React, { useState, useEffect } from "react";
import { 
  Tablet, Search, Filter, Plus, Smartphone, Monitor, 
  Wifi, WifiOff, AlertCircle, ChevronRight, X, UserCircle,
  MoreVertical, Clock, Hash, MapPin, Key
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

// Mock Data
const MOCK_FLOORS = ["Main Dining", "Patio", "Bar Area", "Private Room"];
const MOCK_SECTIONS = ["Window Seats", "Booths", "Center", "Bar Stools"];

const INITIAL_MOCK_DEVICES = [
  {
    id: "DEV-001",
    name: "Front Desk iPad",
    type: "Tablet",
    floor: "Main Dining",
    section: "Window Seats",
    status: "Online",
    lastLogin: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    lastSeen: new Date(Date.now() - 1000 * 60 * 2),
    registeredDate: new Date("2026-01-10"),
    browserFingerprint: "e3b0c44298fc1c149afbf4c8996fb924",
    createdBy: "Admin User",
    assignedShift: "Morning Shift - Front",
    currentEmployee: "Sarah Jenkins"
  },
  {
    id: "DEV-002",
    name: "Bar Register POS",
    type: "Monitor",
    floor: "Bar Area",
    section: "Bar Stools",
    status: "Online",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    lastSeen: new Date(Date.now() - 1000 * 60 * 1),
    registeredDate: new Date("2026-02-15"),
    browserFingerprint: "5d41402abc4b2a76b9719d911017c592",
    createdBy: "Admin User",
    assignedShift: "Bar Open to Close",
    currentEmployee: "Mike Rossi"
  },
  {
    id: "DEV-003",
    name: "Waitress Tablet 1",
    type: "Tablet",
    floor: "Patio",
    section: "Center",
    status: "Offline",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    registeredDate: new Date("2026-03-20"),
    browserFingerprint: "7d793037a0760186574b0282f2f435e7",
    createdBy: "Admin User",
    assignedShift: null,
    currentEmployee: null
  },
  {
    id: "DEV-004",
    name: "Kitchen KDS",
    type: "Monitor",
    floor: "Main Dining",
    section: "Center",
    status: "Disabled",
    lastLogin: new Date("2026-05-10"),
    lastSeen: new Date("2026-05-10"),
    registeredDate: new Date("2026-01-15"),
    browserFingerprint: "8d969eef6ecad3c29a3a629280e686cf",
    createdBy: "System Installer",
    assignedShift: null,
    currentEmployee: null
  }
];

export default function DeviceManagementPage() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form for Add Device
  const form = useForm({
    defaultValues: {
      name: "",
      type: "",
      floor: "",
      section: "",
      description: ""
    }
  });

  // Simulate API load
  useEffect(() => {
    const timer = setTimeout(() => {
      setDevices(INITIAL_MOCK_DEVICES);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAddDevice = (data) => {
    // Generate mock browser fingerprint
    const mockFingerprint = btoa(navigator.userAgent + Date.now()).substring(0, 32).toLowerCase();
    
    const newDevice = {
      id: `DEV-00${devices.length + 1}`,
      name: data.name,
      type: data.type,
      floor: data.floor,
      section: data.section,
      description: data.description,
      status: "Online", // default mock status
      lastLogin: new Date(),
      lastSeen: new Date(),
      registeredDate: new Date(),
      browserFingerprint: mockFingerprint,
      createdBy: "Current Admin",
      assignedShift: null,
      currentEmployee: null
    };

    setDevices([...devices, newDevice]);
    toast.success(`${data.name} has been registered successfully.`);
    setIsAddDialogOpen(false);
    form.reset();
  };

  const toggleDeviceStatus = (device) => {
    const newStatus = device.status === "Disabled" ? "Offline" : "Disabled"; // Simulate enable -> offline state
    
    setDevices(devices.map(d => 
      d.id === device.id ? { ...d, status: newStatus } : d
    ));
    
    if (selectedDevice && selectedDevice.id === device.id) {
      setSelectedDevice({ ...selectedDevice, status: newStatus });
    }

    toast.success(`${device.name} has been ${newStatus === "Disabled" ? "disabled" : "enabled"}.`);
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          device.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Online":
        return <Badge className="bg-emerald-100 text-emerald-700 border-none"><Wifi className="w-3 h-3 mr-1" /> Online</Badge>;
      case "Offline":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>;
      case "Disabled":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-none"><AlertCircle className="w-3 h-3 mr-1" /> Disabled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case "Tablet": return <Tablet className="w-8 h-8 text-blue-600" />;
      case "Smartphone": return <Smartphone className="w-8 h-8 text-indigo-600" />;
      case "Monitor": return <Monitor className="w-8 h-8 text-emerald-600" />;
      default: return <Tablet className="w-8 h-8 text-slate-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 lg:p-10 font-sans">
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Device Setup</h1>
            <p className="text-slate-500 mt-1">Manage and register POS hardware and tablets for your restaurant.</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold rounded-lg px-6">
                <Plus className="w-4 h-4 mr-2" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Device</DialogTitle>
                <DialogDescription>
                  Add a new tablet or terminal to the restaurant. The browser fingerprint will be automatically generated.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddDevice)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: "Device name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Front Desk iPad" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    rules={{ required: "Device type is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            <SelectItem value="Tablet">Tablet</SelectItem>
                            <SelectItem value="Monitor">Monitor (KDS/POS)</SelectItem>
                            <SelectItem value="Smartphone">Smartphone</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="floor"
                      rules={{ required: "Floor is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Floor</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select floor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {MOCK_FLOORS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="section"
                      rules={{ required: "Section is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Section</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {MOCK_SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Register</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Search by device name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="Filter Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Offline">Offline</SelectItem>
                <SelectItem value="Disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="rounded-2xl border border-slate-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <Skeleton className="w-16 h-6 rounded-full" />
                  </div>
                  <Skeleton className="w-3/4 h-6 mb-2" />
                  <Skeleton className="w-1/2 h-4 mb-6" />
                  <div className="space-y-2">
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-full h-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Tablet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No devices found</h3>
            <p className="text-slate-500 mt-1 max-w-sm text-center">
              We couldn&apos;t find any devices matching your filters. Try adjusting your search or register a new device.
            </p>
            <Button 
              variant="outline" 
              className="mt-6 border-slate-300"
              onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDevices.map(device => (
              <Card 
                key={device.id} 
                className={`rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg ${
                  device.status === 'Disabled' ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-200'
                }`}
              >
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-5">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        device.type === 'Tablet' ? 'bg-blue-50' : 
                        device.type === 'Smartphone' ? 'bg-indigo-50' : 'bg-emerald-50'
                      }`}>
                        {getDeviceIcon(device.type)}
                      </div>
                      {getStatusBadge(device.status)}
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 truncate">{device.name}</h3>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {device.floor} • {device.section}
                      </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">ID</span>
                        <span className="font-semibold text-slate-700">{device.id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Last Seen</span>
                        <span className="font-medium text-slate-700">
                          {format(device.lastSeen, "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <Sheet open={isDrawerOpen && selectedDevice?.id === device.id} onOpenChange={(open) => {
                      setIsDrawerOpen(open);
                      if (open) setSelectedDevice(device);
                      else setTimeout(() => setSelectedDevice(null), 300); // Wait for transition
                    }}>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="w-full bg-white border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold" onClick={() => setSelectedDevice(device)}>
                          View Details
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="sm:max-w-md p-0 overflow-y-auto bg-slate-50">
                        {selectedDevice && (
                          <div className="flex flex-col h-full">
                            <div className="p-6 bg-white border-b border-slate-200">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                                  {getDeviceIcon(selectedDevice.type)}
                                </div>
                                <div>
                                  <h2 className="text-xl font-bold text-slate-900">{selectedDevice.name}</h2>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-medium text-slate-500">{selectedDevice.id}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    {getStatusBadge(selectedDevice.status)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-6 space-y-6">
                              {/* Assignment Info */}
                              <section>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-orange-500" /> Location Assignment
                                </h3>
                                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Floor</span>
                                    <span className="text-sm font-semibold text-slate-900">{selectedDevice.floor}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Section</span>
                                    <span className="text-sm font-semibold text-slate-900">{selectedDevice.section}</span>
                                  </div>
                                </div>
                              </section>

                              {/* Active Usage */}
                              <section>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                  <UserCircle className="w-4 h-4 text-blue-500" /> Current Usage
                                </h3>
                                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Active Shift</span>
                                    {selectedDevice.assignedShift ? (
                                      <span className="text-sm font-semibold text-slate-900">{selectedDevice.assignedShift}</span>
                                    ) : (
                                      <span className="text-sm font-medium text-slate-400 italic">No active shift</span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Logged in User</span>
                                    {selectedDevice.currentEmployee ? (
                                      <span className="text-sm font-semibold text-slate-900">{selectedDevice.currentEmployee}</span>
                                    ) : (
                                      <span className="text-sm font-medium text-slate-400 italic">None</span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Last Login</span>
                                    <span className="text-sm font-semibold text-slate-900">{format(selectedDevice.lastLogin, "MMM d, h:mm a")}</span>
                                  </div>
                                </div>
                              </section>

                              {/* Security Info */}
                              <section>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                  <Key className="w-4 h-4 text-emerald-500" /> Security & System
                                </h3>
                                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                                  <div className="space-y-1">
                                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Browser Fingerprint</span>
                                    <p className="text-sm font-mono text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 break-all">
                                      {selectedDevice.browserFingerprint}
                                    </p>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm text-slate-500 font-medium">Registered</span>
                                    <span className="text-sm font-semibold text-slate-900">{format(selectedDevice.registeredDate, "MMM d, yyyy")}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Registered By</span>
                                    <span className="text-sm font-semibold text-slate-900">{selectedDevice.createdBy}</span>
                                  </div>
                                </div>
                              </section>
                            </div>

                            {/* Actions Footer */}
                            <div className="mt-auto p-6 bg-white border-t border-slate-200 space-y-3">
                              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Device Management</h3>
                              <Button 
                                variant={selectedDevice.status === "Disabled" ? "outline" : "destructive"} 
                                className="w-full font-semibold"
                                onClick={() => toggleDeviceStatus(selectedDevice)}
                              >
                                {selectedDevice.status === "Disabled" ? "Enable Device Access" : "Disable Device Access"}
                              </Button>
                              <p className="text-xs text-slate-500 text-center leading-relaxed">
                                {selectedDevice.status === "Disabled" 
                                  ? "Enabling this device will allow employees to log into POS shifts from this hardware." 
                                  : "Disabling this device will immediately block any future logins from this specific hardware."}
                              </p>
                            </div>
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
