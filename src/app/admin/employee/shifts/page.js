"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertTriangle, Clock, Trash2, Copy, FilePlus, CalendarDays, Settings, Edit, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ShiftManagementPage() {
  const [activeTab, setActiveTab] = useState("templates");
  
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Template Form State
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "", startTime: "09:00", endTime: "17:00", color: "blue", repeatPattern: "Weekly",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  });

  // Apply Template State
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedTemplateToApply, setSelectedTemplateToApply] = useState(null);
  const [applyRange, setApplyRange] = useState("thisMonth");
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Calendar State
  const [selectedCalendarEmployee, setSelectedCalendarEmployee] = useState("all");
  const [currentMonthStart, setCurrentMonthStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d;
  });

  // Single Day Edit State
  const [isEditDayDialogOpen, setIsEditDayDialogOpen] = useState(false);
  const [editDayDate, setEditDayDate] = useState(null);
  const [editDayShift, setEditDayShift] = useState(null);
  const [editDayEmployee, setEditDayEmployee] = useState(null);
  const [editDayForm, setEditDayForm] = useState({
    shiftType: "Regular", status: "Scheduled", notes: ""
  });

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const empRes = await fetch("/api/employees", { cache: "no-store" });
      const empJson = await empRes.json();
      if (empJson.success) setEmployees(empJson.data);

      const tplRes = await fetch("/api/employees/shifts?action=templates", { cache: "no-store" });
      const tplJson = await tplRes.json();
      if (tplJson.success) {
        setTemplates(tplJson.data);
        if (tplJson.data.length > 0 && activeTab === "templates") {
          // Stay on templates tab, just shows dashboard instead of empty state
        }
      }

      const shiftRes = await fetch("/api/employees/shifts", { cache: "no-store" });
      const shiftJson = await shiftRes.json();
      if (shiftJson.success) setShifts(shiftJson.data);

    } catch (err) {
      toast.error("Failed to load schedule data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Template Management
  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.startTime || !templateForm.endTime || templateForm.workingDays.length === 0) {
      toast.error("Please fill out all required fields and select at least one working day.");
      return;
    }
    try {
      const res = await fetch("/api/employees/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createTemplate",
          ...templateForm
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Shift Template created successfully!");
        setIsTemplateDialogOpen(false);
        fetchInitialData();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Error creating template");
    }
  };

  // Apply Template
  const openApplyTemplate = (template) => {
    setSelectedTemplateToApply(template);
    setSelectedEmployees([]);
    setApplyRange("thisMonth");
    setIsApplyDialogOpen(true);
  };

  const handleApplyTemplate = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Select at least one employee.");
      return;
    }
    
    let startDate = new Date();
    let endDate = new Date();
    
    if (applyRange === "thisMonth") {
      startDate.setDate(1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    } else if (applyRange === "nextMonth") {
      startDate.setMonth(startDate.getMonth() + 1, 1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    }
    
    try {
      const res = await fetch("/api/employees/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "applyTemplateEngine",
          templateId: selectedTemplateToApply._id,
          employeeIds: selectedEmployees,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Schedule generated successfully!");
        setIsApplyDialogOpen(false);
        fetchInitialData();
        setActiveTab("calendar");
      } else {
        toast.error(json.message);
      }
    } catch(e) {
      toast.error("Error generating schedule.");
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const calendarDays = useMemo(() => {
    const year = currentMonthStart.getFullYear();
    const month = currentMonthStart.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    
    const days = [];
    // Padding before 1st
    const padDays = firstDay === 0 ? 6 : firstDay - 1; // Start on Monday
    for (let i = 0; i < padDays; i++) days.push(null);
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonthStart]);

  const handlePrevMonth = () => {
    const d = new Date(currentMonthStart);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonthStart(d);
  };
  const handleNextMonth = () => {
    const d = new Date(currentMonthStart);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonthStart(d);
  };

  const openEditDay = (date, shift, emp) => {
    setEditDayDate(date);
    setEditDayEmployee(emp);
    setEditDayShift(shift);
    if (shift) {
      setEditDayForm({ shiftType: shift.shiftType || "Regular", status: shift.status || "Scheduled", notes: shift.notes || "" });
    } else {
      setEditDayForm({ shiftType: "Leave", status: "Cancelled", notes: "" });
    }
    setIsEditDayDialogOpen(true);
  };

  const handleSaveEditDay = async () => {
    if (!editDayShift) return toast.error("Creating ad-hoc single days coming soon. Apply a template first.");
    
    try {
      const res = await fetch("/api/employees/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editDayShift._id,
          employeeId: editDayEmployee ? editDayEmployee._id : (editDayShift?.employee?._id || editDayShift?.employee || null),
          date: editDayDate.toISOString(),
          shiftType: editDayForm.shiftType,
          status: editDayForm.status,
          notes: editDayForm.notes
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Day updated.");
        setIsEditDayDialogOpen(false);
        fetchInitialData();
      } else {
        toast.error(json.message);
      }
    } catch(e) {
      toast.error("Error updating day.");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto space-y-8 font-sans">
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Shift Management
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Create templates and automatically generate monthly schedules.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 border-zinc-200 text-zinc-700">
                <Link href="/admin/employee/lists">
                  <ArrowLeft className="w-5 h-5" />
                  Back to Staff
                </Link>
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-100 bg-white border border-zinc-200 p-1 h-12 rounded-lg">
              <TabsTrigger value="templates" className="rounded-md font-bold text-[14px] data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900">
                <Settings className="w-4 h-4 mr-2" /> Templates
              </TabsTrigger>
              <TabsTrigger value="calendar" className="rounded-md font-bold text-[14px] data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900">
                <CalendarIcon className="w-4 h-4 mr-2" /> Monthly Calendar
              </TabsTrigger>
            </TabsList>

            {/* TEMPLATES TAB */}
            <TabsContent value="templates" className="pt-6">
              {loading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" /></div>
              ) : templates.length === 0 ? (
                // EMPTY STATE
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-zinc-200 border-dashed">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <CalendarDays className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">No Shift Templates Found</h2>
                  <p className="text-zinc-500 max-w-md text-center mb-6">
                    Stop manually entering times every day. Create your restaurant&apos;s first weekly shift template and automatically generate schedules in one click.
                  </p>
                  <Button onClick={() => setIsTemplateDialogOpen(true)} className="bg-[#1e40af] text-white hover:bg-[#1e40af]/90 h-12 px-6 font-bold">
                    <Plus className="w-5 h-5 mr-2" /> Create First Shift Template
                  </Button>
                </div>
              ) : (
                // TEMPLATE DASHBOARD
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-zinc-800">Shift Template Dashboard</h2>
                    <Button onClick={() => setIsTemplateDialogOpen(true)} className="bg-[#1e40af] text-white hover:bg-[#1e40af]/90">
                      <Plus className="w-4 h-4 mr-2" /> New Template
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {templates.map(tpl => (
                      <div key={tpl._id} className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-zinc-900">{tpl.name}</h3>
                            <div className="text-[13px] font-medium text-zinc-500 mt-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {tpl.startTime} - {tpl.endTime}
                            </div>
                          </div>
                          <div className={`w-3 h-3 rounded-full bg-${tpl.color}-500 border border-${tpl.color}-600`} />
                        </div>
                        <div className="flex flex-wrap gap-1 mb-6">
                          {tpl.workingDays?.map(day => (
                            <span key={day} className="text-[11px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md">{day.substring(0,3)}</span>
                          ))}
                        </div>
                        <div className="flex justify-between border-t border-zinc-100 pt-4">
                          <Button variant="outline" className="text-[13px] h-9 border-zinc-200 text-zinc-600">Edit</Button>
                          <Button onClick={() => openApplyTemplate(tpl)} className="bg-zinc-900 text-white hover:bg-zinc-800 text-[13px] h-9">
                            Apply / Generate <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* MONTHLY CALENDAR TAB */}
            <TabsContent value="calendar" className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" /></div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-zinc-200 mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-10 w-10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="font-bold text-[18px] text-zinc-800 w-40 text-center">
                    {currentMonthStart.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-10 w-10">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-zinc-600">View Employee:</label>
                  <Select value={selectedCalendarEmployee} onValueChange={setSelectedCalendarEmployee}>
                    <SelectTrigger className="w-56 h-10 border-zinc-200 bg-zinc-50 font-bold">
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 mb-3 text-[12px] font-medium text-zinc-600">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div> Regular Shift</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div> Holiday</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></div> Overtime / Emergency</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div> Leave / Vacation</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="p-3 text-center font-bold text-[14px] text-zinc-700 border-r border-zinc-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7">
                  {calendarDays.map((date, i) => {
                    if (!date) return <div key={i} className="min-h-30 bg-zinc-50/50 border-r border-b border-zinc-100 last:border-r-0"></div>;
                    
                    const dayShifts = shifts.filter(s => {
                      const sDate = new Date(s.date);
                      return sDate.getFullYear() === date.getFullYear() && 
                             sDate.getMonth() === date.getMonth() && 
                             sDate.getDate() === date.getDate() &&
                             (selectedCalendarEmployee === "all" || (s.employee?._id || s.employee) === selectedCalendarEmployee);
                    });

                    const isToday = new Date().toDateString() === date.toDateString();
                    const todayClasses = isToday ? "ring-2 ring-[#1e40af] ring-inset z-10 bg-blue-50/20" : "";

                    return (
                      <div key={i} className={`min-h-30 p-2 border-r border-b border-zinc-200 last:border-r-0 hover:bg-zinc-50 transition-colors relative ${todayClasses}`}>
                        <div className={`font-bold text-[13px] mb-2 ${isToday ? 'text-[#1e40af] bg-blue-100 inline-block px-1.5 py-0.5 rounded-md' : 'text-zinc-500'}`}>
                          {date.getDate()}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {dayShifts.map(shift => {
                            const emp = shift.employee ? employees.find(e => e._id === (shift.employee._id || shift.employee)) : null;
                            
                            // Badge Colors
                            let badgeClass = "bg-blue-50 border-blue-200 text-blue-800 hover:border-blue-300";
                            if (shift.shiftType === "Holiday") badgeClass = "bg-green-50 border-green-200 text-green-800";
                            if (shift.shiftType === "Emergency" || shift.shiftType === "Overtime") badgeClass = "bg-yellow-50 border-yellow-200 text-yellow-800";
                            if (["Leave", "Sick Leave", "Vacation"].includes(shift.shiftType)) badgeClass = "bg-red-50 border-red-200 text-red-800";

                            return (
                              <div 
                                key={shift._id} 
                                onClick={() => openEditDay(date, shift, emp)}
                                className={`p-1.5 rounded-md border text-[11px] cursor-pointer transition-all ${badgeClass}`}
                              >
                                {selectedCalendarEmployee === "all" && <div className="font-bold">{emp?.firstName}</div>}
                                <div className="font-medium">
                                  {shift.templateId?.name || shift.shiftType}
                                </div>
                                <div className="opacity-80">
                                  {new Date(shift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </>
            )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* CREATE TEMPLATE DIALOG */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Shift Template</DialogTitle>
            <DialogDescription>Design a reusable schedule block.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Template Name</label>
              <Input placeholder="e.g. Morning Shift" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} className="border-zinc-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700">Start Time</label>
                <Input type="time" value={templateForm.startTime} onChange={e => setTemplateForm({...templateForm, startTime: e.target.value})} className="border-zinc-200" />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700">End Time</label>
                <Input type="time" value={templateForm.endTime} onChange={e => setTemplateForm({...templateForm, endTime: e.target.value})} className="border-zinc-200" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700 block border-b pb-2 mb-2">Working Days</label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`day-${day}`}
                      checked={templateForm.workingDays.includes(day)}
                      onCheckedChange={(checked) => {
                        if(checked) setTemplateForm({...templateForm, workingDays: [...templateForm.workingDays, day]});
                        else setTemplateForm({...templateForm, workingDays: templateForm.workingDays.filter(d => d !== day)});
                      }}
                    />
                    <label htmlFor={`day-${day}`} className="text-sm font-medium">{day}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Repeat Pattern</label>
              <Select value={templateForm.repeatPattern} onValueChange={v => setTemplateForm({...templateForm, repeatPattern: v})}>
                <SelectTrigger className="border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi Weekly">Bi Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)} className="border-zinc-200">Cancel</Button>
            <Button onClick={handleSaveTemplate} className="bg-[#1e40af] text-white">Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPLY TEMPLATE DIALOG */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Apply: {selectedTemplateToApply?.name}</DialogTitle>
            <DialogDescription>Bulk assign this template to employees.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Target Range</label>
              <Select value={applyRange} onValueChange={setApplyRange}>
                <SelectTrigger className="border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="thisMonth">Apply This Month</SelectItem>
                  <SelectItem value="nextMonth">Apply Next Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700 border-b pb-2 mb-2 block">Select Employees</label>
              <div className="max-h-37.5 overflow-y-auto grid grid-cols-2 gap-2">
                {employees.map(emp => (
                  <div key={emp._id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`emp-${emp._id}`}
                      checked={selectedEmployees.includes(emp._id)}
                      onCheckedChange={(checked) => {
                        if(checked) setSelectedEmployees([...selectedEmployees, emp._id]);
                        else setSelectedEmployees(selectedEmployees.filter(id => id !== emp._id));
                      }}
                    />
                    <label htmlFor={`emp-${emp._id}`} className="text-sm font-medium">{emp.firstName} {emp.lastName}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyTemplate} className="bg-[#1e40af] text-white">Generate Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT SINGLE DAY DIALOG */}
      <Dialog open={isEditDayDialogOpen} onOpenChange={setIsEditDayDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Single Day</DialogTitle>
            <DialogDescription>{editDayDate?.toLocaleDateString()} - {editDayEmployee?.firstName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Mark Status</label>
              <Select value={editDayForm.shiftType} onValueChange={v => setEditDayForm({...editDayForm, shiftType: v})}>
                <SelectTrigger className="border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Regular">Regular Shift</SelectItem>
                  <SelectItem value="Leave">Mark Leave</SelectItem>
                  <SelectItem value="Sick Leave">Mark Sick Leave</SelectItem>
                  <SelectItem value="Vacation">Mark Vacation</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                  <SelectItem value="Overtime">Overtime</SelectItem>
                  <SelectItem value="Emergency">Emergency Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Notes</label>
              <Input placeholder="Reason for change..." value={editDayForm.notes} onChange={e => setEditDayForm({...editDayForm, notes: e.target.value})} className="border-zinc-200" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditDay} className="bg-zinc-900 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
