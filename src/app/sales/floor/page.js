"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import { Loader2, Users, AlertCircle, CheckCircle2, Lock, ChevronLeft, Settings2, UserPlus, FileEdit, Star, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { employeeFetch } from "@/lib/employeeFetch";
import { isSalesAdminRole } from "@/utils/roles";

export default function SalesFloorPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [floorData, setFloorData] = useState({ floors: [], tables: [], sessions: [], activeFloorId: null });
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [scale, setScale] = useState(1);
  const floorViewportRef = React.useRef(null);
  /** Client-side table view filter: all | mine | available */
  const [tableFilter, setTableFilter] = useState("all");

  // Modals
  const [selectedTable, setSelectedTable] = useState(null);
  const [showStartSession, setShowStartSession] = useState(false);
  const [showTableActions, setShowTableActions] = useState(false);
  const [showAdminOverride, setShowAdminOverride] = useState(false);
  const [adminOverrideReason, setAdminOverrideReason] = useState("");
  // Warning shown when employee is about to claim a table whose defaultEmployee is someone else
  const [showDefaultWarning, setShowDefaultWarning] = useState(false);
  
  // Action Sub-views
  const [actionView, setActionView] = useState("MAIN"); // MAIN, GUESTS, TRANSFER, RECONFIGURE
  
  // Form States
  const [guestCount, setGuestCount] = useState(1);
  const [effectiveSeatCount, setEffectiveSeatCount] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch user — /api/auth/me returns the Employee or POS Admin document.
      const userRes = await employeeFetch("/api/auth/me");
      const userData = await userRes.json();
      if (userRes.ok && userData.success && userData.data) {
        const u = userData.data.employee || userData.data;
        setCurrentUser(u);
      }

      const floorRes = await employeeFetch("/api/sales/floor");
      const floorJson = await floorRes.json();
      if (floorRes.ok && floorJson.success && floorJson.data) {
        setFloorData(floorJson.data);
      } else {
        toast.error(floorJson.message || "Failed to load floor data");
        return;
      }

      const empRes = await employeeFetch("/api/sales/employees");
      const empData = await empRes.json();
      if (empRes.ok && empData.success) {
        setActiveEmployees(empData.data || []);
      }
    } catch (err) {
      toast.error("Failed to load floor data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    const handleReconnect = () => {
      loadData();
    };
    
    window.addEventListener('socket:reconnect', handleReconnect);
    
    if (socket) {
      socket.on('table:assigned', loadData);
      socket.on('table:updated', loadData);
      socket.on('table:released', loadData);
      socket.on('table:transferred', loadData);
      socket.on('order:created', loadData);
      socket.on('order:updated', loadData);
      socket.on('payment:completed', loadData);
      socket.on('NEW_PRINT_JOB', () => {
        toast.message("New print job queued", { description: "Open Print Jobs to preview / test." });
      });
    }
    
    return () => {
      window.removeEventListener('socket:reconnect', handleReconnect);
      if (socket) {
        socket.off('table:assigned', loadData);
        socket.off('table:updated', loadData);
        socket.off('table:released', loadData);
        socket.off('table:transferred', loadData);
        socket.off('order:created', loadData);
        socket.off('order:updated', loadData);
        socket.off('payment:completed', loadData);
        socket.off('NEW_PRINT_JOB');
      }
    };
  }, [socket, loadData]);

  useEffect(() => {
    if (socket && floorData.activeFloorId) {
      socket.emit("join", `floor:${floorData.activeFloorId}`);
    }
  }, [socket, floorData.activeFloorId]);

  // Helper: get the current employee's MongoDB _id as a string for reliable comparison
  const currentUserId = currentUser?._id?.toString() || currentUser?.id?.toString() || null;

  const handleTableClick = (table) => {
    const session = floorData.sessions.find(s => s.tableId === table.id?.toString());
    const isAdmin = isSalesAdminRole(currentUser?.role);
    // Reliable comparison: session owner uses MongoDB _id
    const isMineSession = session && (
      session.assignedEmployeeId === currentUserId
    );

    if (!session) {
      // Table is AVAILABLE.
      // If the table has a defaultEmployee that is someone else, show a brief warning first.
      // This is UX-only — the backend will still allow the operation.
      const hasOtherDefault = table.defaultEmployeeId && table.defaultEmployeeId !== currentUserId;
      setSelectedTable(table);
      setGuestCount(table.seats || 2);
      if (hasOtherDefault && !isAdmin) {
        setShowDefaultWarning(true);
      } else {
        setShowStartSession(true);
      }
    } else if (isMineSession || isAdmin) {
      // Occupied by me (or I am admin)
      setSelectedTable({ ...table, session });
      setActionView("MAIN");
      setShowTableActions(true);
    } else {
      // Occupied by someone else
      setSelectedTable({ ...table, session });
      setActionView("READONLY");
      setShowTableActions(true);
    }
  };

  const handleStartSession = async () => {
    try {
      setActionLoading(true);
      const res = await employeeFetch("/api/sales/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTable.id, guestCount: parseInt(guestCount, 10) })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Table assigned");
        setShowStartSession(false);
        setSelectedTable(null);
        const sessionId = json.data?._id?.toString() || json.data?.id?.toString();
        if (sessionId) {
          router.push(`/sales/orders/${sessionId}`);
        } else {
          loadData();
        }
      } else {
        toast.error(json.message || "Failed to assign table");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const executeAction = async (action, payload = {}) => {
    try {
      setActionLoading(true);
      const res = await employeeFetch("/api/sales/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedTable.session.id,
          action,
          guestCount: payload?.guestCount,
          effectiveSeatCount: payload?.effectiveSeatCount,
          notes: payload?.notes,
          newEmployeeId: payload?.newEmployeeId,
          adminOverride: payload?.adminOverride,
          releaseReason: payload?.releaseReason
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        if (action === "RELEASE") {
          setShowAdminOverride(false);
          setAdminOverrideReason("");
        }
        setShowTableActions(false);
        loadData();
      } else {
        if (json.message && json.message.includes("Cannot release table with unpaid")) {
          if (isSalesAdminRole(currentUser?.role) || currentUser?.role === "Manager") {
            setShowAdminOverride(true);
          } else {
            toast.error("Cannot release table with unpaid orders.");
          }
        } else {
          toast.error(json.message || "Action failed");
        }
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const floorWidth = floorData.floors.find(f => f.id === floorData.activeFloorId)?.width || 1200;
  const floorHeight = floorData.floors.find(f => f.id === floorData.activeFloorId)?.height || 800;
  const tableCount = floorData.tables.length;
  const activeSessionCount = floorData.sessions.length;
  const activeOrderCount = floorData.sessions.filter((s) => s.hasActiveOrder).length;

  // Fit floor canvas to laptop/tablet viewport so tables aren't tiny in empty space
  // Must run before any early return (Rules of Hooks).
  useEffect(() => {
    const el = floorViewportRef.current;
    if (!el || !floorWidth || !floorHeight) return;

    const fit = () => {
      const pad = 24;
      const availW = Math.max(el.clientWidth - pad, 320);
      const availH = Math.max(el.clientHeight - pad, 240);
      const next = Math.min(availW / floorWidth, availH / floorHeight);
      // Allow mild upscale on large laptops; keep a sensible min for tablets
      setScale(Math.min(Math.max(next, 0.75), 1.65));
    };

    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [floorWidth, floorHeight, floorData.tables.length]);

  if (loading && floorData.tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 sm:px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-zinc-900 tracking-tight">Floor Operations</h1>
            <p className="text-xs md:text-sm font-medium text-zinc-500 mt-0.5">
              {tableCount} Tables • {activeSessionCount} Active
              {activeOrderCount > 0 ? ` • ${activeOrderCount} with orders` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/sales/print-jobs")}
              variant="outline"
              size="sm"
              className="h-9 md:h-10 text-xs md:text-sm font-semibold border-zinc-200 px-3"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Jobs
            </Button>
            <Button
              onClick={() => router.push("/sales/today")}
              variant="outline"
              size="sm"
              className="h-9 md:h-10 text-xs md:text-sm font-semibold border-zinc-200 px-3"
            >
              Today&apos;s Orders
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: "All Tables" },
              { id: "mine", label: "My Tables" },
              { id: "available", label: "Available" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTableFilter(f.id)}
                className={`rounded-lg text-xs border-2 font-semibold px-3 py-1.5 transition-colors ${
                  tableFilter === f.id
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white border border-zinc-300" />
              <span className="text-sm font-medium text-zinc-500">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
              <span className="text-sm font-medium text-zinc-500">My Section</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400 border border-orange-500" />
              <span className="text-sm font-medium text-zinc-500">Serving</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-emerald-600" />
              <span className="text-sm font-medium text-zinc-500">Payment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-500 border border-zinc-600" />
              <span className="text-sm font-medium text-zinc-500">Others</span>
            </div>
          </div>
        </div>
      </header>

      <div ref={floorViewportRef} className="relative flex-1 overflow-auto bg-zinc-50/80 p-3 sm:p-4 custom-scrollbar">
        <div 
          className="relative mx-auto rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
          style={{ width: floorWidth, height: floorHeight, transform: `scale(${scale})`, transformOrigin: 'top center' }}
        >
          {floorData.tables.map(table => {
            const tableId = table.id?.toString();
            const session = floorData.sessions.find(s => s.tableId === tableId);
            // Live session ownership — TableSession.assignedEmployee is the source of truth
            const isMine = session && session.assignedEmployeeId === currentUserId;
            const isOther = session && !isMine;
            // Default section ownership — admin configuration, not live state
            const isMyDefault = !session && table.defaultEmployeeId && table.defaultEmployeeId === currentUserId;
            const isOthersDefault = !session && table.defaultEmployeeId && table.defaultEmployeeId !== currentUserId;

            // Client-side filter (UI only — does not change assign/lock logic)
            const matchesFilter =
              tableFilter === "all" ||
              (tableFilter === "available" && !session) ||
              (tableFilter === "mine" && (isMine || isMyDefault));
            
            let bgClass = "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm";
            let textClass = "text-zinc-900";
            let statusLabel = "AVAILABLE";
            let statusClass = "text-zinc-500";

            if (session?.status === "PAYMENT_PENDING") {
              bgClass = "bg-emerald-50/80 border-emerald-300 hover:border-emerald-400";
              textClass = "text-emerald-950";
              statusLabel = "PAYMENT";
              statusClass = "text-emerald-700";
            } else if (isMine) {
              bgClass = "bg-orange-50/80 border-orange-300 hover:border-orange-400";
              textClass = "text-orange-950";
              statusLabel = "SERVING";
              statusClass = "text-orange-700";
            } else if (isOther) {
              bgClass = "bg-slate-50 border-slate-300 opacity-95";
              textClass = "text-slate-700";
              statusLabel = "OCCUPIED";
              statusClass = "text-slate-500";
            } else if (isMyDefault) {
              bgClass = "bg-orange-50/40 border-orange-200 hover:border-orange-300 hover:shadow-sm";
              textClass = "text-orange-900";
              statusLabel = "MY SECTION";
              statusClass = "text-orange-600";
            }

            const employeeFirst =
              session?.assignedEmployeeName?.split(" ")[0] ||
              table.defaultEmployeeName?.split(" ")[0] ||
              null;

            return (
              <div
                key={tableId}
                onClick={() => matchesFilter && handleTableClick(table)}
                className={`absolute flex flex-col items-center justify-center border-2 transition-all duration-150 px-2.5 py-2 ${bgClass} ${table.shape === "round" ? "rounded-full" : "rounded-xl"} ${
                  matchesFilter
                    ? "cursor-pointer"
                    : "opacity-20 pointer-events-none grayscale"
                }`}
                style={{
                  left: table.x,
                  top: table.y,
                  width: table.width,
                  height: table.height,
                  transform: `rotate(${table.rotation}deg)`,
                  boxSizing: "border-box",
                }}
              >
                <span className={`text-base md:text-lg font-bold tracking-tight leading-tight ${textClass}`}>
                  {table.tableNumber}
                </span>

                <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide leading-none ${statusClass}`}>
                  {statusLabel}
                </span>

                {session ? (
                  <div className="mt-2 flex items-center gap-1 min-w-0 px-0.5">
                    {employeeFirst && (
                      <span className={`text-[11px] font-bold truncate max-w-full ${textClass}`}>
                        {employeeFirst}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className={`h-4 w-4 ${statusClass}`} />
                      <span className={`text-[12px] font-semibold ${statusClass}`}>
                        {session.guestCount}
                      </span>
                    </div>
                  </div>
                ) : isMyDefault ? (
                  <div className="mt-2 flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 text-orange-400 fill-orange-400" />
                    <span className="text-[10px] font-semibold text-orange-500">
                      {table.seats} seats
                    </span>
                  </div>
                ) : isOthersDefault ? (
                  <span className="mt-2 text-[10px] font-medium text-zinc-400 truncate max-w-[90%] text-center">
                    {employeeFirst || `${table.seats} seats`}
                  </span>
                ) : (
                  <span className="mt-2 text-[10px] font-semibold text-zinc-500">
                    {table.seats} seats
                  </span>
                )}

                {/* Lock icon for occupied tables owned by other employees */}
                {isOther && (
                  <div className="absolute -top-1.5 -right-1.5 bg-zinc-700 border-2 border-white rounded-full p-0.5 shadow-sm">
                    <Lock className="h-3 w-3 text-white" />
                  </div>
                )}

                {/* Subtle serving indicator for my own active table */}
                {isMine && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Default Section Warning — shown when claiming another employee's default table */}
      {/* This is UX-only. The backend does NOT block this operation. */}
      <Dialog open={showDefaultWarning} onOpenChange={(open) => {
        if (!open) {
          setShowDefaultWarning(false);
          setSelectedTable(null);
        }
      }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900">
              Table {selectedTable?.tableNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-amber-800 leading-snug">
                Table {selectedTable?.tableNumber} is normally served by{" "}
                <span className="font-bold">{selectedTable?.defaultEmployeeName}</span>.
                You can still take this table.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="font-bold border-zinc-200"
              onClick={() => {
                setShowDefaultWarning(false);
                setSelectedTable(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold"
              onClick={() => {
                setShowDefaultWarning(false);
                setShowStartSession(true);
              }}
            >
              Take Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Session Modal */}
      <Dialog open={showStartSession} onOpenChange={setShowStartSession}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900">
              Table {selectedTable?.tableNumber}
            </DialogTitle>
            <p className="text-sm font-medium text-zinc-500">
              {selectedTable?.seats}-seat table
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block text-center mb-4">
                Number of Guests
              </label>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-12 w-12 rounded-full border-2 border-zinc-200"
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                >
                  -
                </Button>
                <div className="flex-1 text-center text-4xl font-black text-zinc-800">
                  {guestCount}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-12 w-12 rounded-full border-2 border-zinc-200"
                  onClick={() => setGuestCount(guestCount + 1)}
                >
                  +
                </Button>
              </div>
              <p className="text-center text-sm font-semibold text-zinc-500 mt-4">
                {guestCount} of {selectedTable?.seats} seats will be occupied
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStartSession(false)}
              className="h-12 font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartSession}
              disabled={actionLoading}
              className="h-12 bg-zinc-900 font-bold text-white hover:bg-zinc-800"
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Seat Guests"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Actions Modal */}
      <Dialog open={showTableActions} onOpenChange={setShowTableActions}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            {/* Back button: only for sub-views of MAIN, never for READONLY (would allow escalating to full action menu) */}
            {actionView !== "MAIN" && actionView !== "READONLY" && (
              <Button variant="ghost" size="icon" className="absolute left-4 top-4" onClick={() => setActionView("MAIN")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 text-center">
              {actionView === "MAIN" && `Table ${selectedTable?.tableNumber}`}
              {actionView === "READONLY" && `Table ${selectedTable?.tableNumber}`}
              {actionView === "GUESTS" && "Adjust Guests / Seats"}
              {actionView === "TRANSFER" && "Transfer Table"}
              {actionView === "RECONFIGURE" && "Temporary Table Setup"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {actionView === "MAIN" && (
              <div className="flex flex-col gap-3">
                <div className="text-center mb-4">
                  <p className="text-sm font-semibold text-zinc-500">
                    {floorData.floors.find(f => f.id === floorData.activeFloorId)?.name || "Ground Floor"}
                  </p>
                  <p className="text-sm font-bold text-zinc-700 mt-1">
                    {selectedTable?.session?.guestCount} Guests • {selectedTable?.session?.effectiveSeatCount || selectedTable?.seats} Seats
                  </p>
                  <p className="text-sm font-semibold text-zinc-500 mt-1">
                    Assigned to {selectedTable?.session?.assignedEmployeeName}
                  </p>
                  <p className="text-xs font-semibold text-zinc-400 mt-1">
                    Open for {Math.floor((new Date() - new Date(selectedTable?.session?.openedAt)) / 60000)} min
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-900 border-2 border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                  onClick={() => router.push(`/sales/orders/${selectedTable?.session?.id}`)}
                >
                  <CheckCircle2 className="mr-3 h-5 w-5 text-zinc-600" />
                  {selectedTable?.session?.hasActiveOrder ? "Continue Order" : "Create Order"}
                </Button>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-700 border-2 border-zinc-200"
                  onClick={() => {
                    setGuestCount(selectedTable?.session?.guestCount || 1);
                    setEffectiveSeatCount(selectedTable?.session?.guestCount || selectedTable?.seats || 1);
                    setActionView("GUESTS");
                  }}
                >
                  <Users className="mr-3 h-5 w-5 text-zinc-400" />
                  Adjust Guests / Seats
                </Button>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-700 border-2 border-zinc-200"
                  onClick={() => setActionView("TRANSFER")}
                >
                  <UserPlus className="mr-3 h-5 w-5 text-zinc-400" />
                  Transfer Table
                </Button>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-700 border-2 border-zinc-200"
                  onClick={() => {
                    setEffectiveSeatCount(selectedTable?.session?.effectiveSeatCount || selectedTable?.seats || 4);
                    setActionView("RECONFIGURE");
                  }}
                >
                  <Settings2 className="mr-3 h-5 w-5 text-zinc-400" />
                  Temporary Table Setup
                </Button>
                
                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-red-600 border-2 border-red-100 bg-red-50 hover:bg-red-100"
                  onClick={() => executeAction("RELEASE")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <AlertCircle className="mr-3 h-5 w-5" />}
                  Release Table
                </Button>
              </div>
            )}

            {actionView === "READONLY" && (
              <div className="flex flex-col gap-3">
                <div className="text-center mb-4">
                  <p className="text-sm font-semibold text-zinc-500">
                    {floorData.floors.find(f => f.id === floorData.activeFloorId)?.name || "Ground Floor"}
                  </p>
                  <p className="text-sm font-bold text-zinc-700 mt-1">
                    {selectedTable?.session?.guestCount} Guests
                  </p>
                  <p className="text-sm font-semibold text-zinc-500 mt-1">
                    Assigned to {selectedTable?.session?.assignedEmployeeName}
                  </p>
                  {selectedTable?.session?.hasActiveOrder && (
                    <p className="text-sm font-bold text-blue-600 mt-1">
                      Order in progress
                    </p>
                  )}
                </div>
                
                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-center">
                  <p className="text-sm font-medium text-zinc-600">
                    This table is currently being served by {selectedTable?.session?.assignedEmployeeName}.
                  </p>
                </div>

                {isSalesAdminRole(currentUser?.role) && (
                  <Button
                    variant="outline"
                    className="h-12 mt-4 font-bold text-zinc-700 border-2 border-zinc-200 w-full"
                    onClick={() => setActionView("MAIN")}
                  >
                    Admin Override Actions
                  </Button>
                )}
              </div>
            )}

            {actionView === "GUESTS" && (
              <div className="flex flex-col gap-6 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-center block">
                    Actual Guests
                  </label>
                  <div className="flex items-center gap-4 px-4">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>-</Button>
                    <div className="flex-1 text-center text-4xl font-black text-zinc-800">{guestCount}</div>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setGuestCount(guestCount + 1)}>+</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-center block">
                    Effective Seats (Current TableSession only)
                  </label>
                  <div className="flex items-center gap-4 px-4">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setEffectiveSeatCount(Math.max(1, effectiveSeatCount - 1))}>-</Button>
                    <div className="flex-1 text-center text-4xl font-black text-zinc-800">{effectiveSeatCount}</div>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setEffectiveSeatCount(effectiveSeatCount + 1)}>+</Button>
                  </div>
                </div>
                <Button onClick={() => executeAction("UPDATE_GUESTS", { guestCount, effectiveSeatCount })} disabled={actionLoading} className="h-12 font-bold w-full mt-4">
                  Save Adjustments
                </Button>
              </div>
            )}

            {actionView === "TRANSFER" && (
              <div className="flex flex-col gap-3 py-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {activeEmployees.filter(emp => emp.id?.toString() !== currentUserId).length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-8">No other eligible employees available.</p>
                ) : (
                  activeEmployees
                    .filter(emp => emp.id?.toString() !== currentUserId)
                    .map(emp => (
                      <Button 
                        key={emp.id} 
                        variant="outline" 
                        className="h-14 justify-start px-4 font-bold text-zinc-700"
                        onClick={() => executeAction("TRANSFER", { newEmployeeId: emp.id })}
                        disabled={actionLoading}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center mr-3 border border-zinc-200">
                          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: emp.color || '#ccc' }}></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span>{emp.name}</span>
                          <span className="text-[12px] font-semibold text-zinc-900 uppercase">{emp.role}</span>
                        </div>
                      </Button>
                    ))
                )}
              </div>
            )}

            {actionView === "RECONFIGURE" && (
              <div className="flex flex-col gap-6 py-4">
                <p className="text-sm text-zinc-500 text-center">
                  This temporarily changes the seat capacity for the duration of this session without permanently corrupting the Admin floor configuration.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-center block">
                    Session Seat Count
                  </label>
                  <div className="flex items-center gap-4 px-4">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setEffectiveSeatCount(Math.max(1, effectiveSeatCount - 1))}>-</Button>
                    <div className="flex-1 text-center text-4xl font-black text-zinc-800">{effectiveSeatCount}</div>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setEffectiveSeatCount(effectiveSeatCount + 1)}>+</Button>
                  </div>
                </div>
                <Button onClick={() => executeAction("RECONFIGURE", { effectiveSeatCount })} disabled={actionLoading} className="h-12 font-bold w-full mt-4">
                  Reconfigure Table
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Override Dialog */}
      <Dialog open={showAdminOverride} onOpenChange={setShowAdminOverride}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-red-600">
              Admin Override Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-semibold text-zinc-600">
              There are unpaid orders on this table. To forcefully release it, please provide a reason.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Reason for Release
              </label>
              <Textarea 
                placeholder="e.g. Guest walked out, Comped by Manager..."
                value={adminOverrideReason}
                onChange={(e) => setAdminOverrideReason(e.target.value)}
                className="w-full min-h-[100px] border-zinc-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdminOverride(false);
                setAdminOverrideReason("");
              }}
              className="font-bold border-zinc-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => executeAction("RELEASE", { adminOverride: true, releaseReason: adminOverrideReason })}
              disabled={actionLoading || adminOverrideReason.trim().length < 3}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Force Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
