"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, Clock, Trash2, FilePlus, CalendarDays, Settings, Edit,
  UserCheck, UserX, RotateCcw, Timer, Umbrella, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─── Display helpers ─────────────────────────────────────────────────────────

const DUTY_LABELS = {
  AssignDuty:      'Duty Assigned',
  ChangeShift:     'Shift Changed',
  MarkLeave:       'On Leave',
  MarkHoliday:     'Holiday',
  ApproveOvertime: 'Overtime',
  MarkAbsent:      'Absent',
  CancelDuty:      'Cancelled',
  RestorePlanned:  'Restored',
};

const DUTY_BADGE = {
  AssignDuty:      'bg-green-50 text-green-800 border-green-200',
  ChangeShift:     'bg-blue-50 text-blue-800 border-blue-200',
  MarkLeave:       'bg-red-50 text-red-800 border-red-200',
  MarkHoliday:     'bg-pink-50 text-pink-800 border-pink-200',
  ApproveOvertime: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  MarkAbsent:      'bg-zinc-100 text-zinc-700 border-zinc-200',
};

const DUTY_DOT = {
  AssignDuty:      '#16a34a',
  ChangeShift:     '#2563eb',
  MarkLeave:       '#dc2626',
  MarkHoliday:     '#db2777',
  ApproveOvertime: '#d97706',
  MarkAbsent:      '#6b7280',
};

const MODE_TITLES = {
  assignDuty:      'Assign Duty (OFF Day)',
  changeShift:     'Change Shift',
  markLeave:       'Mark Leave / Holiday',
  approveOvertime: 'Approve Overtime',
  markAbsent:      'Mark Absent',
};

const EMPTY_DUTY_FORM = {
  newShiftTemplateId: '', newStartTime: '', newEndTime: '',
  leaveType: 'Leave', reason: '', approvedBy: '', notes: '', estimatedHours: 2,
};

const DUTY_CHANGE_ENDPOINTS = [
  "/api/employees/shifts?action=dutyChanges",
  "/api/employees/shifts/duty-changes",
];

async function fetchDutyChangeRoute(options) {
  let lastResponse = null;

  for (let i = 0; i < DUTY_CHANGE_ENDPOINTS.length; i += 1) {
    const response = await fetch(DUTY_CHANGE_ENDPOINTS[i], options);

    if (response.status !== 404 || i === DUTY_CHANGE_ENDPOINTS.length - 1) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ShiftManagementPage() {
  const [activeTab, setActiveTab] = useState("templates");

  // ── Data ────────────────────────────────────────────────────────────────────
  const [shifts,      setShifts]      = useState([]);
  const [dutyChanges, setDutyChanges] = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [templates,   setTemplates]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  // ── Template form ────────────────────────────────────────────────────────────
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "", startTime: "09:00", endTime: "17:00", color: "blue",
    repeatPattern: "Weekly",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete,    setTemplateToDelete]   = useState(null);

  // ── Apply template ───────────────────────────────────────────────────────────
  const [isApplyDialogOpen,       setIsApplyDialogOpen]       = useState(false);
  const [selectedTemplateToApply, setSelectedTemplateToApply] = useState(null);
  const [applyRange,              setApplyRange]              = useState("thisMonth");
  const [selectedEmployees,       setSelectedEmployees]       = useState([]);
  const [overwriteExisting,       setOverwriteExisting]       = useState(false);
  const [applyLoading,            setApplyLoading]            = useState(false);

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const [selectedCalendarEmployee, setSelectedCalendarEmployee] = useState("all");
  const [currentMonthStart, setCurrentMonthStart] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });

  // ── Daily Duty Dialog ────────────────────────────────────────────────────────
  const [isDutyDialogOpen,        setIsDutyDialogOpen]        = useState(false);
  const [dutyDialogEmployee,      setDutyDialogEmployee]      = useState(null);
  const [dutyDialogDate,          setDutyDialogDate]          = useState(null);
  const [dutyDialogPlannedShift,  setDutyDialogPlannedShift]  = useState(null);
  const [dutyDialogExistingChange,setDutyDialogExistingChange]= useState(null);
  const [dutyDialogMode,          setDutyDialogMode]          = useState('view');
  const [dutyDialogLoading,       setDutyDialogLoading]       = useState(false);
  const [dutyForm,                setDutyForm]                = useState(EMPTY_DUTY_FORM);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, tplRes, shiftRes, dcRes] = await Promise.all([
        fetch("/api/employees",                          { cache: "no-store" }),
        fetch("/api/employees/shifts?action=templates",  { cache: "no-store" }),
        fetch("/api/employees/shifts",                   { cache: "no-store" }),
        fetchDutyChangeRoute({ cache: "no-store" }),
      ]);
      const [empJson, tplJson, shiftJson, dcJson] = await Promise.all([
        empRes.json(), tplRes.json(), shiftRes.json(), dcRes.json(),
      ]);
      if (empJson.success)   setEmployees(empJson.data);
      if (tplJson.success)   setTemplates(tplJson.data);
      if (shiftJson.success) setShifts(shiftJson.data);
      if (dcJson.success)    setDutyChanges(dcJson.data);
    } catch {
      toast.error("Failed to load schedule data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // ─── Template Handlers ──────────────────────────────────────────────────────

  const handleOpenEditTemplate = (tpl) => {
    setTemplateForm({
      _id: tpl._id, name: tpl.name || "", startTime: tpl.startTime || "",
      endTime: tpl.endTime || "", color: tpl.color || "blue",
      repeatPattern: tpl.repeatPattern || "Weekly", workingDays: tpl.workingDays || [],
    });
    setTimeout(() => setIsTemplateDialogOpen(true), 150);
  };

  const handleOpenNewTemplate = () => {
    setTemplateForm({
      name: "", startTime: "09:00", endTime: "17:00", color: "blue",
      repeatPattern: "Weekly",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    });
    setTimeout(() => setIsTemplateDialogOpen(true), 150);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.startTime || !templateForm.endTime || templateForm.workingDays.length === 0) {
      toast.error("Please fill out all required fields and select at least one working day."); return;
    }
    try {
      const action = templateForm._id ? "updateTemplate" : "createTemplate";
      const res  = await fetch("/api/employees/shifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...templateForm }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Shift Template ${templateForm._id ? 'updated' : 'created'} successfully!`);
        setIsTemplateDialogOpen(false); fetchInitialData();
      } else { toast.error(json.message); }
    } catch { toast.error("Error saving template"); }
  };

  const handleDeleteTemplate = (id) => {
    setTimeout(() => { setTemplateToDelete(id); setIsDeleteDialogOpen(true); }, 150);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      const res  = await fetch(`/api/employees/shifts?id=${templateToDelete}&action=template`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Template deleted successfully");
        setIsDeleteDialogOpen(false); setTemplateToDelete(null); fetchInitialData();
      } else { toast.error(json.message); }
    } catch { toast.error("Error deleting template"); }
  };

  // ─── Apply Template ─────────────────────────────────────────────────────────

  const openApplyTemplate = (template) => {
    setTimeout(() => {
      setSelectedTemplateToApply(template);
      setSelectedEmployees([]); setApplyRange("thisMonth"); setOverwriteExisting(false);
      setIsApplyDialogOpen(true);
    }, 150);
  };

  const applyPreview = useMemo(() => {
    if (!selectedTemplateToApply) return null;
    let startDate = new Date(), endDate = new Date();
    if (applyRange === "thisMonth") {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      endDate   = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    } else {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
      endDate   = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    }
    let workingDays = 0, totalDays = 0;
    const cur = new Date(startDate);
    while (cur <= endDate) {
      totalDays++;
      if (selectedTemplateToApply.workingDays?.includes(cur.toLocaleDateString('en-US', { weekday: 'long' }))) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }
    return { startDate, endDate, totalDays, workingDays, offDays: totalDays - workingDays, totalShifts: workingDays * selectedEmployees.length };
  }, [selectedTemplateToApply, applyRange, selectedEmployees]);

  const handleApplyTemplate = async () => {
    if (selectedEmployees.length === 0) { toast.error("Select at least one employee."); return; }
    let startDate = new Date(), endDate = new Date();
    if (applyRange === "thisMonth") {
      startDate.setDate(1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    } else {
      startDate.setMonth(startDate.getMonth() + 1, 1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    }
    setApplyLoading(true);
    try {
      const res  = await fetch("/api/employees/shifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "applyTemplateEngine",
          templateId: selectedTemplateToApply._id,
          employeeIds: selectedEmployees,
          startDate: startDate.toISOString(),
          endDate:   endDate.toISOString(),
          overwrite: overwriteExisting,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Schedule generated successfully!");
        setIsApplyDialogOpen(false); fetchInitialData(); setActiveTab("calendar");
      } else { toast.error(json.message); }
    } catch { toast.error("Error generating schedule."); }
    finally   { setApplyLoading(false); }
  };

  // ─── Calendar Helpers ───────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const year = currentMonthStart.getFullYear(), month = currentMonthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay    = new Date(year, month, 1).getDay();
    const padDays     = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < padDays; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentMonthStart]);

  const prevMonth = () => { const d = new Date(currentMonthStart); d.setMonth(d.getMonth() - 1); setCurrentMonthStart(d); };
  const nextMonth = () => { const d = new Date(currentMonthStart); d.setMonth(d.getMonth() + 1); setCurrentMonthStart(d); };

  // ─── Daily Duty Dialog ──────────────────────────────────────────────────────

  const openDutyDialog = useCallback((date, shift, emp, existingChange) => {
    setTimeout(() => {
      setDutyDialogDate(date);
      setDutyDialogPlannedShift(shift || null);
      setDutyDialogEmployee(emp   || null);
      setDutyDialogExistingChange(existingChange || null);
      setDutyDialogMode('view');
      setDutyForm(EMPTY_DUTY_FORM);
      setIsDutyDialogOpen(true);
    }, 150);
  }, []);

  const closeDutyDialog = () => {
    if (dutyDialogLoading) return;
    setIsDutyDialogOpen(false);
    setTimeout(() => setDutyDialogMode('view'), 200);
  };

  // Restore / Cancel — deletes the existing DutyChange, no form needed
  const handleRestoreOrCancel = async (changeType) => {
    if (!dutyDialogExistingChange) return;
    setDutyDialogLoading(true);
    try {
      const res  = await fetchDutyChangeRoute({
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:    dutyDialogEmployee?._id,
          date:          dutyDialogDate?.toISOString(),
          plannedShiftId: dutyDialogPlannedShift?._id || null,
          changeType,
          reason:    'Admin action',
          approvedBy:'Admin',
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(changeType === 'RestorePlanned'
          ? 'Shift restored to planned schedule'
          : 'Assigned duty cancelled');
        closeDutyDialog(); fetchInitialData();
      } else { toast.error(json.message); }
    } catch { toast.error("Operation failed"); }
    finally   { setDutyDialogLoading(false); }
  };

  // Form submit — creates a DutyChange for all other action types
  const handleDutyFormSubmit = async (e) => {
    e.preventDefault();
    const modeMap = {
      assignDuty:      'AssignDuty',
      changeShift:     'ChangeShift',
      markLeave:       'MarkLeave',
      approveOvertime: 'ApproveOvertime',
      markAbsent:      'MarkAbsent',
    };
    const changeType = modeMap[dutyDialogMode];
    if (!changeType) return;

    if ((dutyDialogMode === 'assignDuty' || dutyDialogMode === 'changeShift') && !dutyForm.newStartTime) {
      toast.error("Please set the shift start time."); return;
    }
    if (!dutyForm.reason.trim()) { toast.error("Please provide a reason."); return; }

    setDutyDialogLoading(true);
    try {
      const dateStr = dutyDialogDate?.toISOString().split('T')[0];
      const body = {
        employeeId:       dutyDialogEmployee?._id,
        date:             dutyDialogDate?.toISOString(),
        plannedShiftId:   dutyDialogPlannedShift?._id || null,
        changeType,
        reason:           dutyForm.reason,
        approvedBy:       dutyForm.approvedBy || 'Admin',
        notes:            dutyForm.notes,
        ...(dutyDialogMode === 'markLeave'       && { leaveType: dutyForm.leaveType }),
        ...(dutyDialogMode === 'approveOvertime' && { estimatedHours: Number(dutyForm.estimatedHours) }),
        ...(dutyForm.newShiftTemplateId          && { newShiftTemplateId: dutyForm.newShiftTemplateId }),
        ...(dutyForm.newStartTime && {
          newStartTime: new Date(`${dateStr}T${dutyForm.newStartTime}:00`).toISOString(),
        }),
        ...(dutyForm.newEndTime && {
          newEndTime: new Date(`${dateStr}T${dutyForm.newEndTime}:00`).toISOString(),
        }),
      };

      const res  = await fetchDutyChangeRoute({
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${DUTY_LABELS[changeType] || changeType} recorded successfully`);
        closeDutyDialog(); fetchInitialData();
      } else { toast.error(json.message); }
    } catch { toast.error("Failed to save duty change"); }
    finally   { setDutyDialogLoading(false); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto space-y-8 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>Shift Management</h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>Create templates and generate monthly planned schedules.</p>
            </div>
            <Button variant="outline" asChild className="h-10 px-4 font-semibold text-[15px] gap-2 border-zinc-200 text-zinc-700">
              <Link href="/admin/employee/lists"><ArrowLeft className="w-5 h-5" /> Back to Staff</Link>
            </Button>
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

            {/* ── TEMPLATES TAB ─────────────────────────────────────────────── */}
            <TabsContent value="templates" className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" /></div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-zinc-200 border-dashed">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4"><CalendarDays className="w-8 h-8 text-blue-500" /></div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">No Shift Templates Found</h2>
                  <p className="text-zinc-500 max-w-md text-center mb-6">Create your restaurant&apos;s first weekly shift template and automatically generate schedules in one click.</p>
                  <Button onClick={() => setIsTemplateDialogOpen(true)} className="bg-[#1e40af] text-white hover:bg-[#1e40af]/90 h-12 px-6 font-bold">
                    <Plus className="w-5 h-5 mr-2" /> Create First Shift Template
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-zinc-800">Shift Template Dashboard</h2>
                    <Button onClick={handleOpenNewTemplate} className="bg-[#1e40af] hover:bg-blue-800 text-white font-semibold">
                      <FilePlus className="w-4 h-4 mr-2" /> New Template
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {templates.map(tpl => (
                      <div key={tpl._id} className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-zinc-900">{tpl.name}</h3>
                            <div className="text-[13px] font-medium text-zinc-500 mt-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {tpl.startTime} – {tpl.endTime}
                            </div>
                          </div>
                          <div className={`w-3 h-3 rounded-full bg-${tpl.color}-500 border border-${tpl.color}-600`} />
                        </div>
                        <div className="flex flex-wrap gap-1 mb-6">
                          {tpl.workingDays?.map(day => (
                            <span key={day} className="text-[11px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md">{day.substring(0, 3)}</span>
                          ))}
                        </div>
                        <div className="flex justify-between border-t border-zinc-100 pt-4">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" className="text-[13px] h-9 border-zinc-200 text-zinc-600" onClick={() => handleOpenEditTemplate(tpl)}>Edit</Button>
                            <Button variant="outline" className="h-9 w-9 p-0 border-zinc-200 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTemplate(tpl._id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

            {/* ── MONTHLY CALENDAR TAB ──────────────────────────────────────── */}
            <TabsContent value="calendar" className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" /></div>
              ) : (
                <>
                  {/* Controls */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-zinc-200 mb-6 gap-4">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="icon" onClick={prevMonth} className="h-10 w-10"><ChevronLeft className="h-5 w-5" /></Button>
                      <span className="font-bold text-[18px] text-zinc-800 w-40 text-center">
                        {currentMonthStart.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                      </span>
                      <Button variant="outline" size="icon" onClick={nextMonth} className="h-10 w-10"><ChevronRight className="h-5 w-5" /></Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-bold text-zinc-600">Employee:</label>
                      <Select value={selectedCalendarEmployee} onValueChange={setSelectedCalendarEmployee}>
                        <SelectTrigger className="w-56 h-10 border-zinc-200 bg-zinc-50 font-bold"><SelectValue placeholder="All Employees" /></SelectTrigger>
                        <SelectContent className="bg-white max-h-60 overflow-y-auto">
                          <SelectItem value="all">All Employees</SelectItem>
                          {employees.map(emp => (
                            <SelectItem key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-end gap-4 mb-3 text-[12px] font-medium text-zinc-600 flex-wrap">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Planned</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-200" /> Duty Assigned</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" /> Overtime</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Leave / Absent</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#d97706' }} /> Has Change</div>
                  </div>

                  {/* Grid */}
                  <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                        <div key={d} className="p-3 text-center font-bold text-[14px] text-zinc-700 border-r border-zinc-200 last:border-r-0">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {calendarDays.map((date, i) => {
                        if (!date) return <div key={i} className="min-h-30 bg-zinc-50/50 border-r border-b border-zinc-100 last:border-r-0" />;

                        const sameDay = (a, b) =>
                          new Date(a).getFullYear() === b.getFullYear() &&
                          new Date(a).getMonth()    === b.getMonth()    &&
                          new Date(a).getDate()     === b.getDate();

                        const matchesEmpFilter = (id) =>
                          selectedCalendarEmployee === "all" || id === selectedCalendarEmployee;

                        const dayShifts = shifts.filter(s =>
                          sameDay(s.date, date) && matchesEmpFilter(s.employee?._id || s.employee)
                        );

                        const dayDutyChanges = dutyChanges.filter(dc =>
                          sameDay(dc.date, date) && matchesEmpFilter(dc.employee?._id || dc.employee)
                        );

                        const isToday = new Date().toDateString() === date.toDateString();

                        return (
                          <div key={i} className={`min-h-30 p-2 border-r border-b border-zinc-200 last:border-r-0 hover:bg-zinc-50 transition-colors relative ${isToday ? 'ring-2 ring-[#1e40af] ring-inset bg-blue-50/20' : ''}`}>
                            <div className={`font-bold text-[13px] mb-2 ${isToday ? 'text-[#1e40af] bg-blue-100 inline-block px-1.5 py-0.5 rounded-md' : 'text-zinc-500'}`}>
                              {date.getDate()}
                            </div>
                            <div className="flex flex-col gap-1.5">

                              {/* Planned shifts (with duty change overlay if applicable) */}
                              {dayShifts.map(shift => {
                                const empId      = shift.employee?._id || shift.employee;
                                const emp        = employees.find(e => e._id === empId);
                                const dutyChange = dayDutyChanges.find(dc => (dc.employee?._id || dc.employee) === empId);

                                let badgeClass = "bg-blue-50 border-blue-200 text-blue-800";
                                if (dutyChange) {
                                  badgeClass = DUTY_BADGE[dutyChange.changeType] || "bg-zinc-100 border-zinc-200 text-zinc-700";
                                } else {
                                  if (shift.shiftType === "Holiday")                                   badgeClass = "bg-green-50 border-green-200 text-green-800";
                                  if (["Emergency","Overtime"].includes(shift.shiftType))              badgeClass = "bg-yellow-50 border-yellow-200 text-yellow-800";
                                  if (["Leave","Sick Leave","Vacation"].includes(shift.shiftType))     badgeClass = "bg-red-50 border-red-200 text-red-800";
                                }

                                return (
                                  <div
                                    key={shift._id}
                                    onClick={() => openDutyDialog(date, shift, emp, dutyChange)}
                                    className={`relative p-1.5 rounded-md border text-[11px] cursor-pointer hover:opacity-80 transition-opacity ${badgeClass}`}
                                  >
                                    {dutyChange && (
                                      <span
                                        className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full ring-1 ring-white"
                                        style={{ backgroundColor: DUTY_DOT[dutyChange.changeType] || '#6b7280' }}
                                        title={DUTY_LABELS[dutyChange.changeType]}
                                      />
                                    )}
                                    {selectedCalendarEmployee === "all" && <div className="font-bold truncate">{emp?.firstName}</div>}
                                    <div className="font-medium">
                                      {dutyChange ? (DUTY_LABELS[dutyChange.changeType] || dutyChange.changeType) : (shift.templateId?.name || shift.shiftType)}
                                    </div>
                                    <div className="opacity-75">
                                      {dutyChange?.newStartTime
                                        ? new Date(dutyChange.newStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Duty changes on OFF days (no planned shift) */}
                              {dayDutyChanges
                                .filter(dc => !dayShifts.some(s => (s.employee?._id || s.employee) === (dc.employee?._id || dc.employee)))
                                .map(dc => {
                                  const dcEmp      = employees.find(e => e._id === (dc.employee?._id || dc.employee));
                                  const badgeClass = DUTY_BADGE[dc.changeType] || 'bg-zinc-100 text-zinc-700 border-zinc-200';
                                  return (
                                    <div
                                      key={dc._id}
                                      onClick={() => openDutyDialog(date, null, dcEmp, dc)}
                                      className={`relative p-1.5 rounded-md border text-[11px] cursor-pointer hover:opacity-80 transition-opacity ${badgeClass}`}
                                    >
                                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full ring-1 ring-white" style={{ backgroundColor: DUTY_DOT[dc.changeType] || '#6b7280' }} />
                                      {selectedCalendarEmployee === "all" && <div className="font-bold truncate">{dcEmp?.firstName}</div>}
                                      <div className="font-medium">{DUTY_LABELS[dc.changeType] || dc.changeType}</div>
                                      {dc.newStartTime && <div className="opacity-75">{new Date(dc.newStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                                    </div>
                                  );
                                })}

                              {/* "Assign Duty" prompt for clean OFF days in single-employee view */}
                              {selectedCalendarEmployee !== "all" && dayShifts.length === 0 && dayDutyChanges.length === 0 && (
                                <div
                                  onClick={() => {
                                    const emp = employees.find(e => e._id === selectedCalendarEmployee);
                                    if (emp) openDutyDialog(date, null, emp, null);
                                  }}
                                  className="text-center text-[12px] text-zinc-800 hover:text-zinc-600 cursor-pointer hover:bg-zinc-100 rounded p-1 border border-dashed border-zinc-500 transition-colors"
                                >
                                  + Assign Duty
                                </div>
                              )}
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

      {/* ─── TEMPLATE DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{templateForm._id ? 'Edit' : 'Create'} Shift Template</DialogTitle>
            <DialogDescription>Design a reusable schedule block.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Template Name</label>
              <Input placeholder="e.g. Morning Shift" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="border-zinc-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700">Start Time</label>
                <Input type="time" value={templateForm.startTime} onChange={e => setTemplateForm({ ...templateForm, startTime: e.target.value })} className="border-zinc-200" />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700">End Time</label>
                <Input type="time" value={templateForm.endTime} onChange={e => setTemplateForm({ ...templateForm, endTime: e.target.value })} className="border-zinc-200" />
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
                      onCheckedChange={checked => {
                        if (checked) setTemplateForm({ ...templateForm, workingDays: [...templateForm.workingDays, day] });
                        else         setTemplateForm({ ...templateForm, workingDays: templateForm.workingDays.filter(d => d !== day) });
                      }}
                    />
                    <label htmlFor={`day-${day}`} className="text-sm font-medium cursor-pointer">{day}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Repeat Pattern</label>
              <Select value={templateForm.repeatPattern} onValueChange={v => setTemplateForm({ ...templateForm, repeatPattern: v })}>
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

      {/* ─── APPLY TEMPLATE DIALOG ───────────────────────────────────────────── */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Generate Schedule: {selectedTemplateToApply?.name}</DialogTitle>
            <DialogDescription>Apply this template to build a monthly planned schedule.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-zinc-700">Target Month</label>
              <Select value={applyRange} onValueChange={setApplyRange}>
                <SelectTrigger className="border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="nextMonth">Next Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview card */}
            {applyPreview && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-[12px] font-bold text-blue-600 uppercase tracking-wide mb-3">Schedule Preview</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Period', value: `${applyPreview.startDate.toLocaleDateString([], { month:'short', day:'numeric' })} – ${applyPreview.endDate.toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' })}` },
                    { label: 'Selected Employees', value: `${selectedEmployees.length}` },
                    { label: 'Working Days / Month', value: `${applyPreview.workingDays} days`, color: 'text-green-700' },
                    { label: 'Total Shifts to Generate', value: `${applyPreview.totalShifts}`, color: 'text-blue-700' },
                  ].map(({ label, value, color = 'text-zinc-900' }) => (
                    <div key={label} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-[10px] text-zinc-400 uppercase font-bold mb-0.5">{label}</div>
                      <div className={`text-[13px] font-bold ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employees selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <label className="text-[13px] font-bold text-zinc-700">Select Employees</label>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-blue-600 hover:underline"
                  onClick={() => setSelectedEmployees(selectedEmployees.length === employees.length ? [] : employees.map(e => e._id))}
                >
                  {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                {employees.map(emp => (
                  <div key={emp._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${emp._id}`}
                      checked={selectedEmployees.includes(emp._id)}
                      onCheckedChange={checked => {
                        if (checked) setSelectedEmployees([...selectedEmployees, emp._id]);
                        else         setSelectedEmployees(selectedEmployees.filter(id => id !== emp._id));
                      }}
                    />
                    <label htmlFor={`emp-${emp._id}`} className="text-sm font-medium cursor-pointer">{emp.firstName} {emp.lastName}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Overwrite toggle */}
            <label htmlFor="overwrite-toggle" className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
              <Checkbox
                id="overwrite-toggle"
                checked={overwriteExisting}
                onCheckedChange={v => setOverwriteExisting(!!v)}
                className="mt-0.5"
              />
              <div>
                <div className="text-[13px] font-bold text-zinc-900">Overwrite Existing Schedule</div>
                <div className="text-[12px] text-zinc-500 mt-0.5">Delete and regenerate if a planned schedule already exists for this period.</div>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyTemplate} disabled={applyLoading} className="bg-[#1e40af] text-white">
              {applyLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : 'Generate Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DAILY DUTY MANAGEMENT DIALOG ───────────────────────────────────── */}
      <Dialog open={isDutyDialogOpen} onOpenChange={open => { if (!open && !dutyDialogLoading) closeDutyDialog(); }}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Daily Duty Management</DialogTitle>
            <DialogDescription>
              {dutyDialogDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Employee info banner */}
            {dutyDialogEmployee && (
              <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="w-10 h-10 rounded-full bg-[#1e40af]/10 flex items-center justify-center text-[#1e40af] font-bold text-sm shrink-0">
                  {dutyDialogEmployee.firstName?.[0]}{dutyDialogEmployee.lastName?.[0]}
                </div>
                <div>
                  <div className="font-bold text-zinc-900 text-[15px]">{dutyDialogEmployee.firstName} {dutyDialogEmployee.lastName}</div>
                  <div className="text-xs text-zinc-500">{dutyDialogEmployee.role} · {dutyDialogEmployee.employeeId || '—'}</div>
                </div>
              </div>
            )}

            {/* Planned shift + current status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="text-[13px] font-bold text-zinc-900 uppercase tracking-wider mb-1.5">Planned Shift</div>
                {dutyDialogPlannedShift ? (
                  <>
                    <div className="font-bold text-zinc-900 text-[13px]">
                      {dutyDialogPlannedShift.templateId?.name || dutyDialogPlannedShift.shiftType || 'Regular'}
                    </div>
                    <div className="text-xs text-zinc-900 mt-0.5">
                      {new Date(dutyDialogPlannedShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {dutyDialogPlannedShift.endTime ? ` – ${new Date(dutyDialogPlannedShift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </div>
                  </>
                ) : (
                  <div className="font-bold text-zinc-700 text-[12px]">OFF Day</div>
                )}
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider mb-1.5">Today&apos;s Status</div>
                {dutyDialogExistingChange ? (
                  <>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${DUTY_BADGE[dutyDialogExistingChange.changeType] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                      {DUTY_LABELS[dutyDialogExistingChange.changeType] || dutyDialogExistingChange.changeType}
                    </span>
                    {dutyDialogExistingChange.leaveType   && <div className="text-xs text-zinc-500 mt-0.5">{dutyDialogExistingChange.leaveType}</div>}
                    {dutyDialogExistingChange.reason      && <div className="text-xs text-zinc-400 mt-0.5 truncate" title={dutyDialogExistingChange.reason}>{dutyDialogExistingChange.reason}</div>}
                  </>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-green-500 text-white border border-green-500">
                    {dutyDialogPlannedShift ? 'As Planned' : 'OFF'}
                  </span>
                )}
              </div>
            </div>

            {/* ── View mode — action buttons ─────────────────────────────────── */}
            {dutyDialogMode === 'view' && (
              <div className="space-y-2">
                {/* OFF day, no existing change → Assign Duty */}
                {!dutyDialogPlannedShift && !dutyDialogExistingChange && (
                  <button id="btn-assign-duty" onClick={() => setDutyDialogMode('assignDuty')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-800 font-semibold text-[14px] cursor-pointer transition-colors text-left">
                    <UserCheck className="w-4 h-4 shrink-0" /> Assign Duty on OFF Day
                  </button>
                )}

                {/* Has planned shift, no existing change → action menu */}
                {dutyDialogPlannedShift && !dutyDialogExistingChange && (
                  <>
                    <button id="btn-change-shift" onClick={() => setDutyDialogMode('changeShift')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-[14px] cursor-pointer transition-colors text-left">
                      <Edit className="w-4 h-4 shrink-0" /> Change Shift
                    </button>
                    <button id="btn-mark-leave" onClick={() => setDutyDialogMode('markLeave')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-semibold text-[14px] cursor-pointer transition-colors text-left">
                      <Umbrella className="w-4 h-4 shrink-0" /> Mark Leave / Holiday
                    </button>
                    <button id="btn-approve-overtime" onClick={() => setDutyDialogMode('approveOvertime')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-semibold text-[14px] cursor-pointer transition-colors text-left">
                      <Timer className="w-4 h-4 shrink-0" /> Approve Overtime
                    </button>
                    <button id="btn-mark-absent" onClick={() => setDutyDialogMode('markAbsent')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-semibold text-[14px] cursor-pointer transition-colors text-left">
                      <UserX className="w-4 h-4 shrink-0" /> Mark Absent
                    </button>
                  </>
                )}

                {/* Existing change → restore / cancel */}
                {dutyDialogExistingChange && (
                  <button
                    id="btn-restore-duty"
                    disabled={dutyDialogLoading}
                    onClick={() => handleRestoreOrCancel(dutyDialogPlannedShift ? 'RestorePlanned' : 'CancelDuty')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-[14px] transition-colors text-left disabled:opacity-50"
                  >
                    {dutyDialogLoading
                      ? <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      : <RotateCcw className="w-4 h-4 shrink-0" />
                    }
                    {dutyDialogPlannedShift ? 'Restore Planned Shift' : 'Cancel Assigned Duty'}
                  </button>
                )}

                {/* If both OFF and has existing change → cancel is the only option (handled above) */}
              </div>
            )}

            {/* ── Action form mode ───────────────────────────────────────────── */}
            {dutyDialogMode !== 'view' && (
              <form id="duty-change-form" onSubmit={handleDutyFormSubmit} className="space-y-4">
                {/* Back header */}
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <button type="button" onClick={() => setDutyDialogMode('view')}
                    className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded-md hover:bg-zinc-100">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-zinc-900 text-[15px]">{MODE_TITLES[dutyDialogMode]}</span>
                </div>

                {/* AssignDuty / ChangeShift fields */}
                {(dutyDialogMode === 'assignDuty' || dutyDialogMode === 'changeShift') && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-zinc-700">Shift Template <span className="text-zinc-400 font-normal">(optional)</span></label>
                      <Select value={dutyForm.newShiftTemplateId} onValueChange={v => {
                        const tpl = templates.find(t => t._id === v);
                        setDutyForm({ ...dutyForm, newShiftTemplateId: v, newStartTime: tpl?.startTime || dutyForm.newStartTime, newEndTime: tpl?.endTime || dutyForm.newEndTime });
                      }}>
                        <SelectTrigger className="border-zinc-200"><SelectValue placeholder="Select template or enter times below" /></SelectTrigger>
                        <SelectContent className="bg-white">
                          {templates.map(tpl => (
                            <SelectItem key={tpl._id} value={tpl._id}>{tpl.name} ({tpl.startTime}–{tpl.endTime})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-zinc-700">Start Time *</label>
                        <Input type="time" value={dutyForm.newStartTime} onChange={e => setDutyForm({ ...dutyForm, newStartTime: e.target.value })} className="border-zinc-200" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-zinc-700">End Time</label>
                        <Input type="time" value={dutyForm.newEndTime} onChange={e => setDutyForm({ ...dutyForm, newEndTime: e.target.value })} className="border-zinc-200" />
                      </div>
                    </div>
                  </>
                )}

                {/* MarkLeave fields */}
                {dutyDialogMode === 'markLeave' && (
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-zinc-700">Leave Type *</label>
                    <Select value={dutyForm.leaveType} onValueChange={v => setDutyForm({ ...dutyForm, leaveType: v })}>
                      <SelectTrigger className="border-zinc-200"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Leave">Leave</SelectItem>
                        <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                        <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                        <SelectItem value="Holiday">Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ApproveOvertime fields */}
                {dutyDialogMode === 'approveOvertime' && (
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-zinc-700">Estimated Overtime Hours</label>
                    <Input type="number" min="0.5" max="12" step="0.5" value={dutyForm.estimatedHours}
                      onChange={e => setDutyForm({ ...dutyForm, estimatedHours: e.target.value })} className="border-zinc-200" />
                  </div>
                )}

                {/* Common fields */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-zinc-700">Reason *</label>
                  <Input
                    id="duty-reason"
                    placeholder="Reason for this duty change…"
                    value={dutyForm.reason}
                    onChange={e => setDutyForm({ ...dutyForm, reason: e.target.value })}
                    className="border-zinc-200"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-zinc-700">Approved By</label>
                    <Input id="duty-approved-by" placeholder="Approver name" value={dutyForm.approvedBy} onChange={e => setDutyForm({ ...dutyForm, approvedBy: e.target.value })} className="border-zinc-200" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-zinc-700">Notes</label>
                    <Input id="duty-notes" placeholder="Additional notes…" value={dutyForm.notes} onChange={e => setDutyForm({ ...dutyForm, notes: e.target.value })} className="border-zinc-200" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                  <Button type="button" variant="outline" onClick={() => setDutyDialogMode('view')} disabled={dutyDialogLoading} className="border-zinc-200">Back</Button>
                  <Button id="btn-submit-duty-change" type="submit" disabled={dutyDialogLoading} className="bg-[#1e40af] text-white">
                    {dutyDialogLoading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                      : <><CheckCircle2 className="w-4 h-4 mr-2" />Save Change</>
                    }
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE TEMPLATE DIALOG ──────────────────────────────────────────── */}
      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteTemplate}
        title="Delete Shift Template"
        description="Are you sure you want to delete this shift template? This action cannot be undone and will not affect shifts that have already been generated."
      />
    </div>
  );
}
