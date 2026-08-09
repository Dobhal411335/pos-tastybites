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

export default function SalesFloorPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [floorData, setFloorData] = useState({ floors: [], tables: [], sessions: [], activeFloorId: null });
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [scale, setScale] = useState(1);

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
  }, [socket]);

  useEffect(() => {
    if (socket && floorData.activeFloorId) {
      socket.emit("join", `floor:${floorData.activeFloorId}`);
    }
  }, [socket, floorData.activeFloorId]);

  // Stable reference so socket.on/socket.off always get the same function identity.
  // loadData only calls setters and fetch — it doesn't read any state directly,
  // so the empty dependency array is safe.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch user — /api/auth/me returns the full Employee document.
      // We store it as-is; the MongoDB _id is available as currentUser._id.
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      if (userData.success) {
        const u = userData.data.employee || userData.data;
        setCurrentUser(u);
      }

      // Fetch floor data
      const floorRes = await fetch("/api/sales/floor");
      const floorData = await floorRes.json();
      if (floorData.success) {
        setFloorData(floorData.data);
      }

      // Fetch eligible employees for transfer
      const empRes = await fetch("/api/sales/employees");
      const empData = await empRes.json();
      if (empData.success) {
        setActiveEmployees(empData.data);
      }
    } catch (err) {
      toast.error("Failed to load floor data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper: get the current employee's MongoDB _id as a string for reliable comparison
  const currentUserId = currentUser?._id?.toString() || currentUser?.id?.toString() || null;

  const handleTableClick = (table) => {
    const session = floorData.sessions.find(s => s.tableId === table.id?.toString());
    const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';
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
      const res = await fetch("/api/sales/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTable.id, guestCount: parseInt(guestCount, 10) })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Table assigned");
        setShowStartSession(false);
        loadData(); // refresh
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
      const res = await fetch("/api/sales/sessions", {
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
          if (currentUser && ["Admin", "Super Admin", "Manager"].includes(currentUser.role)) {
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

  if (loading && floorData.tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const floorWidth = floorData.floors.find(f => f.id === floorData.activeFloorId)?.width || 1200;
  const floorHeight = floorData.floors.find(f => f.id === floorData.activeFloorId)?.height || 800;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Floor Operations</h1>
          <p className="text-sm font-medium text-zinc-500">Tap a table to manage</p>
        </div>
        <div className="flex items-center gap-6">
          <Button onClick={() => router.push("/sales/print-jobs")} variant="outline" className="font-bold border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 text-zinc-700 hidden md:flex">
            <Printer className="w-4 h-4 mr-2" />
            Print Jobs
          </Button>
          <Button onClick={() => router.push("/sales/today")} variant="outline" className="font-bold border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 text-zinc-700 hidden md:flex">
            Today's Orders
          </Button>
        </div>
          <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-white border-2 border-zinc-300"></span>
            <span className="text-xs font-bold text-zinc-600 uppercase">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
            <span className="text-xs font-bold text-zinc-600 uppercase">My Section</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-400 border border-orange-500 shadow-sm"></span>
            <span className="text-xs font-bold text-zinc-600 uppercase">Serving</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-600 shadow-sm"></span>
            <span className="text-xs font-bold text-zinc-600 uppercase">Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-zinc-600 border border-zinc-700 shadow-sm"></span>
            <span className="text-xs font-bold text-zinc-600 uppercase">Others</span>
          </div>
        </div>
      </header>

      <div className="relative flex-1 overflow-auto bg-zinc-50 p-4 custom-scrollbar">
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
            
            let bgClass = "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-md";
            let textClass = "text-zinc-800";

            if (session?.status === "PAYMENT_PENDING") {
              bgClass = "bg-emerald-50 border-emerald-300 shadow-sm";
              textClass = "text-emerald-900";
            } else if (isMine) {
              bgClass = "bg-orange-50 border-orange-300 shadow-sm";
              textClass = "text-orange-900";
            } else if (isOther) {
              bgClass = "bg-slate-100 border-slate-300 shadow-sm opacity-90";
              textClass = "text-slate-500";
            } else if (isMyDefault) {
              // Available and this is my default section
              bgClass = "bg-orange-50/60 border-orange-200 hover:border-orange-300 hover:shadow-md";
              textClass = "text-orange-800";
            }
            // isOthersDefault: keep default white, just show label

            return (
              <div
                key={tableId}
                onClick={() => handleTableClick(table)}
                className={`absolute flex cursor-pointer flex-col items-center justify-center border-2 transition-all duration-200 ${bgClass} ${table.shape === "round" ? "rounded-full" : "rounded-xl"}`}
                style={{
                  left: table.x,
                  top: table.y,
                  width: table.width,
                  height: table.height,
                  transform: `rotate(${table.rotation}deg)`
                }}
              >
                <span className={`text-lg font-black tracking-tight ${textClass}`}>
                  {table.tableNumber}
                </span>

                {session ? (
                  // OCCUPIED: show guest count badge
                  <div className={`mt-1 flex items-center justify-center gap-1 px-2 py-0.5 rounded-full border ${
                    isMine
                      ? 'bg-orange-100 border-orange-200'
                      : session?.status === "PAYMENT_PENDING"
                        ? 'bg-emerald-100 border-emerald-200'
                        : 'bg-slate-200 border-slate-300'
                  }`}>
                    <Users className={`h-3 w-3 ${isMine ? 'text-orange-600' : session?.status === "PAYMENT_PENDING" ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <span className={`text-xs font-bold ${isMine ? 'text-orange-700' : session?.status === "PAYMENT_PENDING" ? 'text-emerald-800' : 'text-slate-600'}`}>
                      {session.guestCount}
                    </span>
                  </div>
                ) : isMyDefault ? (
                  // AVAILABLE + My default section
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 text-orange-400 fill-orange-400" />
                    <span className="text-[9px] font-bold tracking-tight text-orange-500 uppercase">My Section</span>
                  </div>
                ) : isOthersDefault ? (
                  // AVAILABLE + Another employee's default section
                  <span className="mt-1 text-[9px] font-semibold tracking-tight text-zinc-400 truncate max-w-[90%] text-center">
                    {table.defaultEmployeeName?.split(' ')[0]}
                  </span>
                ) : (
                  // AVAILABLE + No default assigned
                  <span className="mt-1 text-[10px] font-bold tracking-tight text-zinc-500">
                    {table.seats} Seats
                  </span>
                )}

                {/* Lock icon for occupied tables owned by other employees */}
                {isOther && (
                  <div className="absolute -top-2 -right-2 bg-zinc-800 border-2 border-white rounded-full p-1 shadow-sm">
                    <Lock className="h-3 w-3 text-white" />
                  </div>
                )}

                {/* Subtle "Serving" dot for my own active table */}
                {isMine && (
                  <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
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

                {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
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
