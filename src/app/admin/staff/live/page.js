"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Users, Search, Filter, RefreshCcw, Wifi, MapPin, 
  Smartphone, Tablet, Monitor, MoreHorizontal, Clock, ArrowUpDown
} from "lucide-react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

// Mock Data
const MOCK_LIVE_EMPLOYEES = [
  {
    id: "EMP-001",
    name: "Sarah Jenkins",
    role: "Manager",
    loginTime: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    lastActivity: new Date(Date.now() - 1000 * 60 * 2), // 2 mins ago
    device: { name: "Front Desk iPad", type: "Tablet" },
    shift: "08:00 AM - 04:00 PM",
    floor: "Main Dining",
    section: "Window Seats",
    tables: ["T1", "T2", "T4"]
  },
  {
    id: "EMP-002",
    name: "Mike Rossi",
    role: "Bartender",
    loginTime: new Date(Date.now() - 3600000 * 1), // 1 hour ago
    lastActivity: new Date(Date.now() - 1000 * 30), // 30 secs ago
    device: { name: "Bar Register POS", type: "Monitor" },
    shift: "04:00 PM - 12:00 AM",
    floor: "Bar Area",
    section: "Bar Stools",
    tables: ["B1", "B2", "B3", "B4"]
  },
  {
    id: "EMP-005",
    name: "David Kim",
    role: "Server",
    loginTime: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    lastActivity: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    device: { name: "Waitress Tablet 2", type: "Tablet" },
    shift: "11:00 AM - 07:00 PM",
    floor: "Patio",
    section: "East Wing",
    tables: ["P1", "P2", "P5"]
  }
];

export default function LiveEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState("All");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const loadData = () => {
    setIsLoading(true);
    setTimeout(() => {
      // Add slight randomness to "lastActivity" to simulate live data
      const updatedMock = MOCK_LIVE_EMPLOYEES.map(emp => ({
        ...emp,
        lastActivity: new Date(Date.now() - Math.floor(Math.random() * 600000)) 
      }));
      setEmployees(updatedMock);
      setLastRefreshed(new Date());
      setIsLoading(false);
    }, 600);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadData();
      }, 30000); // 30 seconds refresh
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    loadData();
    toast.success("Live data refreshed");
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFloor = floorFilter === "All" || emp.floor === floorFilter;
    return matchesSearch && matchesFloor;
  });

  const getDeviceIcon = (type) => {
    switch (type) {
      case "Tablet": return <Tablet className="w-4 h-4 text-blue-500" />;
      case "Smartphone": return <Smartphone className="w-4 h-4 text-indigo-500" />;
      case "Monitor": return <Monitor className="w-4 h-4 text-emerald-500" />;
      default: return <Tablet className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (lastActivityDate) => {
    const diffMins = (Date.now() - lastActivityDate.getTime()) / 60000;
    if (diffMins < 5) return "bg-emerald-500";
    if (diffMins < 15) return "bg-amber-500";
    return "bg-slate-300";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <Toaster richColors />
      
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <div className="relative">
                <Wifi className="w-6 h-6 text-emerald-600" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-emerald-100 animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-emerald-100"></span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Employees</h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5 flex items-center gap-2">
                Monitoring active staff sessions
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                Last updated: {format(lastRefreshed, "hh:mm:ss a")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-refresh" 
                checked={autoRefresh} 
                onCheckedChange={setAutoRefresh}
                className="data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="auto-refresh" className="text-sm font-medium text-slate-600 cursor-pointer">Auto-Refresh (30s)</Label>
            </div>
            <Button 
              variant="outline" 
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="bg-white"
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Search employee name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 h-11 rounded-xl shadow-sm"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={floorFilter} onValueChange={setFloorFilter}>
              <SelectTrigger className="bg-white border-slate-200 h-11 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="Floor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Floors</SelectItem>
                <SelectItem value="Main Dining">Main Dining</SelectItem>
                <SelectItem value="Bar Area">Bar Area</SelectItem>
                <SelectItem value="Patio">Patio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-900 h-12">Employee</TableHead>
                  <TableHead className="font-bold text-slate-900 h-12">Status</TableHead>
                  <TableHead className="font-bold text-slate-900 h-12">Location & Shift</TableHead>
                  <TableHead className="font-bold text-slate-900 h-12">Assigned Tables</TableHead>
                  <TableHead className="font-bold text-slate-900 h-12">Device</TableHead>
                  <TableHead className="font-bold text-slate-900 h-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && employees.length === 0 ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-[250px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Users className="h-8 w-8 mb-2 text-slate-300" />
                        <p className="font-medium text-slate-900">No active employees found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{emp.name}</p>
                            <p className="text-xs font-medium text-slate-500">{emp.id} • {emp.role}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(emp.lastActivity)} shadow-sm border border-white`} />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Online</p>
                            <p className="text-xs text-slate-500">Since {format(emp.loginTime, "h:mm a")}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-500" /> {emp.floor} <span className="text-slate-400 font-normal">/</span> {emp.section}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {emp.shift}
                          </p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {emp.tables.map(t => (
                            <Badge key={t} variant="secondary" className="bg-slate-100 text-slate-700 border border-slate-200">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 w-max">
                          {getDeviceIcon(emp.device.type)}
                          <span className="text-xs font-medium text-slate-700">{emp.device.name}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Reassign Tables</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 font-medium focus:bg-red-50 focus:text-red-700">Force Logout</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 flex justify-between items-center">
            <span>Showing {filteredEmployees.length} active sessions</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active (&lt; 5m)
              <span className="w-2 h-2 rounded-full bg-amber-500 ml-2"></span> Idle (5-15m)
              <span className="w-2 h-2 rounded-full bg-slate-300 ml-2"></span> Away (&gt; 15m)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
