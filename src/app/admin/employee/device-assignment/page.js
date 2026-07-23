"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, LayoutGrid, TabletSmartphone, Plus, Edit, Eye, Search, Filter, UserPlus, Pencil, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
export default function DeviceAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewDeviceAction = searchParams.get("action") === "new";
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  // Assignment Dialog State
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [reassignAlertOpen, setReassignAlertOpen] = useState(false);
  const [reassignMessage, setReassignMessage] = useState("");
  // New Device Dialog State
  const [isNewDeviceDialogOpen, setIsNewDeviceDialogOpen] = useState(isNewDeviceAction);
  const [nextDeviceCode, setNextDeviceCode] = useState("");
  const [newDeviceData, setNewDeviceData] = useState({
    deviceName: "",
    deviceType: "Tablet",
    assignedFloor: "",
    description: "",
    status: "Active"
  });
  const [savingDevice, setSavingDevice] = useState(false);
  // Edit Device State
  const [isEditDeviceDialogOpen, setIsEditDeviceDialogOpen] = useState(false);
  const [editDeviceData, setEditDeviceData] = useState(null);
  const [updatingDevice, setUpdatingDevice] = useState(false);
  // View All Devices Dialog
  const [isViewAllDevicesOpen, setIsViewAllDevicesOpen] = useState(false);
  // View Device Drawer State
  const [viewDeviceDrawerOpen, setViewDeviceDrawerOpen] = useState(false);
  const [deviceToView, setDeviceToView] = useState(null);
  const fetchData = async () => {
    try {
      setLoading(true);
      const [devRes, empRes, floorRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/employees/device-assignment"),
        fetch("/api/floor")
      ]);
      const devJson = await devRes.json();
      const empJson = await empRes.json();
      const floorJson = await floorRes.json();
      if (devJson.success) setDevices(devJson.data);
      if (empJson.success) setEmployees(empJson.data);
      if (floorJson.success) setFloors(floorJson.data);
    } catch (err) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };
  const fetchNextCode = async () => {
    try {
      const res = await fetch("/api/devices/next-code");
      const json = await res.json();
      if (json.success) setNextDeviceCode(json.data.nextCode);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    setIsNewDeviceDialogOpen(isNewDeviceAction);
    if (isNewDeviceAction) {
      fetchNextCode();
    }
  }, [isNewDeviceAction]);
  const handleOpenNewDevice = () => {
    router.push("?action=new", { scroll: false });
  };
  const handleCloseNewDevice = () => {
    router.push("/admin/employee/device-assignment", { scroll: false });
    setNewDeviceData({
      deviceName: "",
      deviceType: "Tablet",
      assignedFloor: "",
      description: "",
      status: "Active"
    });
  };
  const handleSaveNewDevice = async () => {
    if (!newDeviceData.deviceName || !newDeviceData.deviceType) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      setSavingDevice(true);
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeviceData)
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Device registered successfully");
        handleCloseNewDevice();
        fetchData();
      } else {
        toast.error(json.message || "Failed to register device");
      }
    } catch (err) {
      toast.error("Failed to register device");
    } finally {
      setSavingDevice(false);
    }
  };
  const handleOpenEditDevice = (device) => {
    setEditDeviceData({
      _id: device._id,
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      assignedFloor: device.assignedFloor?._id || "",
      description: device.description || "",
      status: device.status
    });
    setIsEditDeviceDialogOpen(true);
  };
  const handleSaveEditDevice = async () => {
    if (!editDeviceData.deviceName || !editDeviceData.deviceType) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setUpdatingDevice(true);
      const res = await fetch("/api/devices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDeviceData)
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Device updated successfully");
        setIsEditDeviceDialogOpen(false);
        fetchData();
      } else {
        toast.error(json.message || "Failed to update device");
      }
    } catch (err) {
      toast.error("Failed to update device");
    } finally {
      setUpdatingDevice(false);
    }
  };
  const handleOpenAssign = (device) => {
    setSelectedDevice(device);
    setSelectedEmployeeId(device.assignedEmployee?._id || "");
    setIsAssignDialogOpen(true);
  };
  const handleSaveAssignment = async (forceReassign = false) => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee.");
      return;
    }
    try {
      setSavingAssignment(true);
      const res = await fetch("/api/employees/device-assignment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          deviceId: selectedDevice._id,
          forceReassign
        })
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "ALREADY_ASSIGNED") {
        setReassignMessage(json.message);
        setReassignAlertOpen(true);
        return;
      }
      if (json.success) {
        toast.success("Device assigned successfully");
        setIsAssignDialogOpen(false);
        setReassignAlertOpen(false);
        fetchData();
      } else {
        toast.error(json.message || "Failed to assign device");
      }
    } catch (err) {
      toast.error("Failed to assign device");
    } finally {
      setSavingAssignment(false);
    }
  };
  const handleViewDevice = (device) => {
    setDeviceToView(device);
    setViewDeviceDrawerOpen(true);
  };
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Maintenance': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Inactive': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Retired': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.deviceCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || d.status === statusFilter;
    const matchesType = typeFilter === "All" || d.deviceType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  return (
    <div className="flex flex-col overflow-hidden min-h-screen bg-[#F8FAFC]">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-350 mx-auto space-y-8 pb-16 font-sans">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Device Inventory & Assignment
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Manage POS devices, track hardware inventory, and assign terminals to your staff.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild className="h-10 px-4 font-semibold gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                <Link href="/admin/employee">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Staff
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setIsViewAllDevicesOpen(true)} className="h-10 px-4 font-semibold gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                <LayoutGrid className="w-4 h-4" />
                View All Devices
              </Button>
              <Button onClick={handleOpenNewDevice} className="h-10 px-4 font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="w-4 h-4" />
                Register New Device
              </Button>
            </div>
          </div>
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by Device Name or Code..."
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
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <SelectValue placeholder="Type" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                  <SelectItem value="Desktop">Desktop</SelectItem>
                  <SelectItem value="POS Terminal">POS Terminal</SelectItem>
                  <SelectItem value="Kitchen Display">Kitchen Display</SelectItem>
                  <SelectItem value="Self Ordering Kiosk">Self Ordering Kiosk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-slate-200/60 bg-white overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <UITable>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6">Device Code</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6">Device Name</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6">Device Type</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6">Assigned Floor</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6">Assigned Employee</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6">Status</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6">Last Login</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-5 px-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-slate-400 font-medium text-sm">
                            No devices found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDevices.map((d) => (
                          <TableRow key={d._id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                            <TableCell className="px-6 py-4 font-bold text-slate-900">{d.deviceCode || "—"}</TableCell>
                            <TableCell className="px-6 py-4 font-semibold text-slate-700">{d.deviceName}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-slate-500">{d.deviceType}</TableCell>
                            <TableCell className="px-6 py-4 text-sm font-medium text-slate-600">{d.assignedFloor?.name || "—"}</TableCell>
                            <TableCell className="px-6 py-4">
                              {d.assignedEmployee ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: d.assignedEmployee.employeeColor || '#94a3b8' }}>
                                    {d.assignedEmployee.firstName?.charAt(0)}{d.assignedEmployee.lastName?.charAt(0)}
                                  </div>
                                  <span className="font-semibold text-sm text-slate-700">{d.assignedEmployee.firstName} {d.assignedEmployee.lastName}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-sm">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Badge className={`shadow-none ${getStatusBadgeColor(d.status)}`}>
                                {d.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />}
                                {d.status === 'Maintenance' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />}
                                {d.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-slate-500">
                              {d.lastLoginAt ? new Date(d.lastLoginAt).toLocaleDateString() : "Never Logged In"}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-white">
                                  <DropdownMenuItem className="text-[14px] font-medium cursor-pointer mb-1" onSelect={() => setTimeout(() => handleViewDevice(d), 150)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Device Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-[14px] font-medium text-[#1e40af] focus:bg-blue-50 cursor-pointer mb-1" onSelect={() => setTimeout(() => handleOpenAssign(d), 150)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Assign Device
                                  </DropdownMenuItem>
                                  <div className="border-t border-zinc-100 my-1"></div>
                                  <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onSelect={() => setTimeout(() => handleOpenEditDevice(d), 150)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Device
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </UITable>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Register New Device Dialog */}
      <Dialog open={isNewDeviceDialogOpen} onOpenChange={(open) => !open && handleCloseNewDevice()}>
        <DialogContent className="sm:max-w-125 bg-white rounded-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black text-slate-900">Register Device</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Device Code</span>
              <span className="font-black text-slate-900 font-mono tracking-wider">{nextDeviceCode || "Generating..."}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Device Name <span className="text-rose-500">*</span></label>
              <Input
                placeholder="e.g. Front Counter Tablet"
                value={newDeviceData.deviceName}
                onChange={(e) => setNewDeviceData({ ...newDeviceData, deviceName: e.target.value })}
                className="bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Device Type <span className="text-rose-500">*</span></label>
                <Select value={newDeviceData.deviceType} onValueChange={(val) => setNewDeviceData({ ...newDeviceData, deviceType: val })}>
                  <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem className="hover:bg-orange-500" value="Tablet">Tablet</SelectItem>
                    <SelectItem className="hover:bg-orange-500" value="Desktop">Desktop</SelectItem>
                    <SelectItem className="hover:bg-orange-500" value="POS Terminal">POS Terminal</SelectItem>
                    <SelectItem className="hover:bg-orange-500" value="Kitchen Display">Kitchen Display</SelectItem>
                    <SelectItem className="hover:bg-orange-500" value="Self Ordering Kiosk">Self Ordering Kiosk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Assigned Floor</label>
                <Select value={newDeviceData.assignedFloor} onValueChange={(val) => setNewDeviceData({ ...newDeviceData, assignedFloor: val })}>
                  <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-white">
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem className="hover:bg-orange-500" value="">None / Unassigned</SelectItem>
                    {floors.map(f => (
                      <SelectItem className="hover:bg-orange-500" key={f._id} value={f._id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Device Status</label>
              <Select value={newDeviceData.status} onValueChange={(val) => setNewDeviceData({ ...newDeviceData, status: val })}>
                <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Active" className="hover:bg-orange-500 cursor-pointer">Active</SelectItem>
                  <SelectItem value="Inactive" className="hover:bg-orange-500 cursor-pointer">Inactive</SelectItem>
                  <SelectItem value="Maintenance" className="hover:bg-orange-500 cursor-pointer">Maintenance</SelectItem>
                  <SelectItem value="Retired" className="hover:bg-orange-500 cursor-pointer">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Description (Optional)</label>
              <Input
                placeholder="e.g. Main checkout counter"
                value={newDeviceData.description}
                onChange={(e) => setNewDeviceData({ ...newDeviceData, description: e.target.value })}
                className="bg-slate-50"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={handleCloseNewDevice} className="font-semibold text-slate-600">Cancel</Button>
            <Button onClick={handleSaveNewDevice} disabled={savingDevice} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-sm">
              {savingDevice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Register Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Assign Device Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-112.5 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              Assign Device
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Selected Device</span>
                <Badge className={`shadow-none text-[10px] ${getStatusBadgeColor(selectedDevice?.status)}`}>{selectedDevice?.status}</Badge>
              </div>
              <p className="font-black text-lg text-slate-900">{selectedDevice?.deviceName}</p>
              <p className="text-sm text-slate-500 font-medium font-mono">{selectedDevice?.deviceCode}</p>
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase">Floor</span>
                <span className="text-sm font-semibold text-slate-700">{selectedDevice?.assignedFloor?.name || "Unassigned"}</span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-900">Assign to Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="bg-white h-12 text-base">
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="">Select an employee...</SelectItem>
                  {employees.map(emp => (
                    <SelectItem className="hover:bg-orange-500 cursor-pointer" key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 font-medium mt-1">Note: An employee can only have one active device.</p>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-5">
            <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)} className="font-semibold text-slate-600">Cancel</Button>
            <Button onClick={() => handleSaveAssignment(false)} disabled={savingAssignment} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm">
              {savingAssignment && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Assign to Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Device Dialog */}
      <Dialog open={isEditDeviceDialogOpen} onOpenChange={setIsEditDeviceDialogOpen}>
        <DialogContent className="sm:max-w-125 bg-white rounded-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black text-slate-900">Edit Device</DialogTitle>
          </DialogHeader>
          {editDeviceData && (
            <div className="grid gap-5 py-4">

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Device Code</span>
                <span className="font-black text-slate-900 font-mono tracking-wider">{editDeviceData.deviceCode}</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Device Name <span className="text-rose-500">*</span></label>
                <Input
                  placeholder="e.g. Front Counter Tablet"
                  value={editDeviceData.deviceName}
                  onChange={(e) => setEditDeviceData({ ...editDeviceData, deviceName: e.target.value })}
                  className="bg-slate-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Device Type <span className="text-rose-500">*</span></label>
                  <Select value={editDeviceData.deviceType} onValueChange={(val) => setEditDeviceData({ ...editDeviceData, deviceType: val })}>
                    <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Desktop">Desktop</SelectItem>
                      <SelectItem value="POS Terminal">POS Terminal</SelectItem>
                      <SelectItem value="Kitchen Display">Kitchen Display</SelectItem>
                      <SelectItem value="Self Ordering Kiosk">Self Ordering Kiosk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Assigned Floor</label>
                  <Select value={editDeviceData.assignedFloor} onValueChange={(val) => setEditDeviceData({ ...editDeviceData, assignedFloor: val })}>
                    <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-white">
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="">None / Unassigned</SelectItem>
                      {floors.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.floorName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Device Status</label>
                <Select value={editDeviceData.status} onValueChange={(val) => setEditDeviceData({ ...editDeviceData, status: val })}>
                  <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description (Optional)</label>
                <Input
                  placeholder="e.g. Main checkout counter"
                  value={editDeviceData.description}
                  onChange={(e) => setEditDeviceData({ ...editDeviceData, description: e.target.value })}
                  className="bg-slate-50"
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsEditDeviceDialogOpen(false)} className="font-semibold text-slate-600">Cancel</Button>
            <Button onClick={handleSaveEditDevice} disabled={updatingDevice} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-sm">
              {updatingDevice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View All Devices Dialog */}
      <Dialog open={isViewAllDevicesOpen} onOpenChange={setIsViewAllDevicesOpen}>
        <DialogContent className="sm:max-w-4xl bg-white max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black text-slate-900">All Devices</DialogTitle>
          </DialogHeader>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <UITable>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-600">Code</TableHead>
                  <TableHead className="font-bold text-slate-600">Name</TableHead>
                  <TableHead className="font-bold text-slate-600">Status</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map(d => (
                  <TableRow key={d._id}>
                    <TableCell className="font-mono font-medium text-slate-700">{d.deviceCode}</TableCell>
                    <TableCell className="font-bold text-slate-900">{d.deviceName}</TableCell>
                    <TableCell>
                      <Badge className={`shadow-none ${getStatusBadgeColor(d.status)}`}>{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                        onClick={() => handleOpenEditDevice(d)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Device
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {devices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">No devices found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </UITable>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reassign Alert Dialog */}
      <AlertDialog open={reassignAlertOpen} onOpenChange={setReassignAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Device Already Assigned</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600">
              {reassignMessage}
              <br /><br />
              Do you want to reassign it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSaveAssignment(true)} className="bg-rose-600 hover:bg-rose-700 font-bold text-white">Reassign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* View Device Drawer */}
      <Sheet open={viewDeviceDrawerOpen} onOpenChange={setViewDeviceDrawerOpen}>
        <SheetContent className="sm:max-w-md w-full bg-slate-50 overflow-y-auto p-0">
          {deviceToView && (
            <div className="flex flex-col h-full">
              <div className="bg-white p-6 border-b border-slate-200">
                <Badge className={`mb-4 shadow-none ${getStatusBadgeColor(deviceToView.status)}`}>{deviceToView.status}</Badge>
                <h2 className="text-2xl font-black text-slate-900">{deviceToView.deviceName}</h2>
                <p className="font-mono text-slate-500 font-medium mt-1">{deviceToView.deviceCode}</p>
              </div>
              <div className="p-6 space-y-6">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hardware Details</h3>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="flex justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500 text-sm font-medium">Type</span>
                      <span className="font-semibold text-slate-900 text-sm">{deviceToView.deviceType}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500 text-sm font-medium">Floor</span>
                      <span className="font-semibold text-slate-900 text-sm">{deviceToView.assignedFloor?.name || "Unassigned"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-sm font-medium mb-1">Description</span>
                      <span className="font-medium text-slate-700 text-sm">{deviceToView.description || "—"}</span>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assignment</h3>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    {deviceToView.assignedEmployee ? (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: deviceToView.assignedEmployee.employeeColor || '#3b82f6' }}>
                          {deviceToView.assignedEmployee.firstName?.charAt(0)}{deviceToView.assignedEmployee.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{deviceToView.assignedEmployee.firstName} {deviceToView.assignedEmployee.lastName}</p>
                          <p className="text-sm text-slate-500 font-medium">{deviceToView.assignedEmployee.role}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-slate-400 italic text-sm">Not assigned to any employee</div>
                    )}
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">System Log</h3>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="flex justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500 text-sm font-medium">Created Date</span>
                      <span className="font-semibold text-slate-700 text-sm">
                        {deviceToView.createdAt ? new Date(deviceToView.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500 text-sm font-medium">Last Login</span>
                      <span className="font-semibold text-slate-700 text-sm">
                        {deviceToView.lastLoginAt ? new Date(deviceToView.lastLoginAt).toLocaleString() : "Never"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Last Seen</span>
                      <span className="font-semibold text-slate-700 text-sm">
                        {deviceToView.lastSeenAt ? new Date(deviceToView.lastSeenAt).toLocaleString() : "Never"}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}