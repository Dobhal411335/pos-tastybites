"use client";

import React, { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { 
  FileSpreadsheet, FileIcon, FileText, Download, 
  Filter, Calendar as CalendarIcon, TrendingUp, Clock, 
  CheckCircle, XCircle, DollarSign, Activity
} from "lucide-react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Mock Data
const MOCK_REPORTS = [
  {
    id: "EMP-001",
    name: "Sarah Jenkins",
    role: "Manager",
    attendance: "98%",
    lateLogins: 1,
    hoursWorked: "142.5",
    completedOrders: 420,
    cancelledOrders: 5,
    avgOrderTime: "12m 30s",
    revenue: 12450.00
  },
  {
    id: "EMP-002",
    name: "Mike Rossi",
    role: "Bartender",
    attendance: "100%",
    lateLogins: 0,
    hoursWorked: "160.0",
    completedOrders: 850,
    cancelledOrders: 2,
    avgOrderTime: "4m 15s",
    revenue: 18200.50
  },
  {
    id: "EMP-003",
    name: "Jessica Chen",
    role: "Server",
    attendance: "95%",
    lateLogins: 3,
    hoursWorked: "120.0",
    completedOrders: 310,
    cancelledOrders: 8,
    avgOrderTime: "15m 45s",
    revenue: 8900.25
  },
  {
    id: "EMP-004",
    name: "David Kim",
    role: "Server",
    attendance: "85%",
    lateLogins: 5,
    hoursWorked: "95.5",
    completedOrders: 240,
    cancelledOrders: 12,
    avgOrderTime: "18m 20s",
    revenue: 6500.00
  }
];

export default function EmployeeReportsPage() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("This Month");
  const [roleFilter, setRoleFilter] = useState("All");

  useEffect(() => {
    setIsLoading(true);
    // Simulate API fetch based on filters
    const timer = setTimeout(() => {
      let filtered = [...MOCK_REPORTS];
      if (roleFilter !== "All") {
        filtered = filtered.filter(r => r.role === roleFilter);
      }
      setReports(filtered);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [timeFilter, roleFilter]);

  const handleExport = (type) => {
    toast.success(`Exporting report as ${type}...`);
  };

  const calculateTotalRevenue = () => reports.reduce((acc, curr) => acc + curr.revenue, 0);
  const calculateTotalHours = () => reports.reduce((acc, curr) => acc + parseFloat(curr.hoursWorked), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-8 font-sans">
      <Toaster richColors />
      
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header & Export Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Performance Reports</h1>
            <p className="text-slate-500 font-medium mt-1">Analyze attendance, order volume, and generated revenue.</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-sm transition-all">
                <Download className="w-4 h-4 mr-2" /> Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl">
              <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase">Download As</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport("CSV")} className="cursor-pointer font-medium py-2">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> CSV Format
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("Excel")} className="cursor-pointer font-medium py-2">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("PDF")} className="cursor-pointer font-medium py-2">
                <FileText className="w-4 h-4 mr-2 text-red-500" /> PDF Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <Label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Time Period</Label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="border-0 bg-slate-50 h-9 font-semibold text-slate-900 focus:ring-0 rounded-lg">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Today">Today</SelectItem>
                    <SelectItem value="This Week">This Week</SelectItem>
                    <SelectItem value="Last Week">Last Week</SelectItem>
                    <SelectItem value="This Month">This Month</SelectItem>
                    <SelectItem value="Last Month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <Label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role Filter</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="border-0 bg-slate-50 h-9 font-semibold text-slate-900 focus:ring-0 rounded-lg">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Server">Server</SelectItem>
                    <SelectItem value="Bartender">Bartender</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-slate-900 rounded-xl p-4 flex flex-col justify-center text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Total Revenue</p>
            <h2 className="text-3xl font-black">${calculateTotalRevenue().toLocaleString()}</h2>
          </div>
        </div>

        {/* Data Table */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="font-bold text-slate-900 h-14 pl-6">Employee</TableHead>
                  <TableHead className="font-bold text-slate-900 h-14"><Clock className="inline w-4 h-4 mr-1 text-slate-400"/> Attendance & Hours</TableHead>
                  <TableHead className="font-bold text-slate-900 h-14"><CheckCircle className="inline w-4 h-4 mr-1 text-emerald-500"/> Order Success</TableHead>
                  <TableHead className="font-bold text-slate-900 h-14"><XCircle className="inline w-4 h-4 mr-1 text-red-500"/> Cancelled</TableHead>
                  <TableHead className="font-bold text-slate-900 h-14"><Activity className="inline w-4 h-4 mr-1 text-blue-500"/> Avg Time</TableHead>
                  <TableHead className="font-bold text-slate-900 h-14 text-right pr-6"><DollarSign className="inline w-4 h-4 mr-1 text-emerald-600"/> Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <TableRow key={i}>
                      <TableCell className="pl-6"><Skeleton className="h-10 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                      <TableCell className="pr-6 text-right"><Skeleton className="h-6 w-[100px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500 font-medium">
                      No report data found for this filter combination.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                            {report.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{report.name}</p>
                            <p className="text-xs font-medium text-slate-500">{report.role}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{report.hoursWorked} hrs</span>
                            <Badge variant="outline" className={`border-none ${parseFloat(report.attendance) >= 95 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {report.attendance}
                            </Badge>
                          </div>
                          {report.lateLogins > 0 && (
                            <p className="text-xs font-medium text-red-500">{report.lateLogins} late logins</p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full">
                          {report.completedOrders}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <span className={`text-sm font-bold ${report.cancelledOrders > 10 ? 'text-red-600' : 'text-slate-600'}`}>
                          {report.cancelledOrders}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm font-semibold text-slate-700">{report.avgOrderTime}</span>
                      </TableCell>
                      
                      <TableCell className="text-right pr-6">
                        <span className="text-base font-black text-emerald-600">
                          ${report.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                
                {/* Summary Row */}
                {!isLoading && reports.length > 0 && (
                  <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                    <TableCell className="pl-6 font-bold text-slate-900">Report Totals</TableCell>
                    <TableCell className="font-bold text-slate-900">{calculateTotalHours().toFixed(1)} hrs</TableCell>
                    <TableCell className="font-bold text-slate-900">{reports.reduce((acc, curr) => acc + curr.completedOrders, 0)}</TableCell>
                    <TableCell className="font-bold text-slate-900">{reports.reduce((acc, curr) => acc + curr.cancelledOrders, 0)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right pr-6 font-black text-slate-900 text-lg">
                      ${calculateTotalRevenue().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>
    </div>
  );
}
