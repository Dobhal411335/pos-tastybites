"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import {
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronLeft,
  Settings2,
  UserPlus,
  FileEdit,
  Printer,
} from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { employeeFetch } from "@/lib/employeeFetch";
import { isSalesAdminRole } from "@/utils/roles";

export default function SalesFloorPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [floorData, setFloorData] = useState({
    floors: [],
    tables: [],
    sessions: [],
    activeFloorId: null,
  });
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [onlineStaff, setOnlineStaff] = useState({ count: 0, online: [] });
  const [scale, setScale] = useState(1);
  const floorViewportRef = React.useRef(null);
  const [gridMode, setGridMode] = useState("lines"); // "lines" | "dots" | "none"

  // Modals
  const [selectedTable, setSelectedTable] = useState(null);
  const [showStartSession, setShowStartSession] = useState(false);
  const [showTableActions, setShowTableActions] = useState(false);
  const [showAdminOverride, setShowAdminOverride] = useState(false);
  const [adminOverrideReason, setAdminOverrideReason] = useState("");

  // Action Sub-views
  const [actionView, setActionView] = useState("MAIN"); // MAIN, GUESTS, TRANSFER, RECONFIGURE

  // Form States
  const [guestCount, setGuestCount] = useState(1);
  const [effectiveSeatCount, setEffectiveSeatCount] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOnlineStaff = useCallback(async () => {
    try {
      const res = await employeeFetch("/api/sales/online");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setOnlineStaff({
          count: json.data.count || 0,
          online: json.data.online || [],
        });
      }
    } catch {
      /* non-blocking */
    }
  }, []);

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

      await loadOnlineStaff();
    } catch (err) {
      toast.error("Failed to load floor data");
    } finally {
      setLoading(false);
    }
  }, [loadOnlineStaff]);

  useEffect(() => {
    loadData();

    const handleReconnect = () => {
      loadData();
    };

    window.addEventListener("socket:reconnect", handleReconnect);

    // Refresh online list periodically (login/logout has no dedicated socket event yet)
    const onlineTimer = setInterval(loadOnlineStaff, 30000);

    if (socket) {
      socket.on("table:assigned", loadData);
      socket.on("table:updated", loadData);
      socket.on("table:released", loadData);
      socket.on("table:transferred", loadData);
      socket.on("order:created", loadData);
      socket.on("order:updated", loadData);
      socket.on("payment:completed", loadData);
      socket.on("NEW_PRINT_JOB", () => {
        toast.message("New print job queued", {
          description: "Open Print Jobs to preview / test.",
        });
      });
    }

    return () => {
      window.removeEventListener("socket:reconnect", handleReconnect);
      clearInterval(onlineTimer);
      if (socket) {
        socket.off("table:assigned", loadData);
        socket.off("table:updated", loadData);
        socket.off("table:released", loadData);
        socket.off("table:transferred", loadData);
        socket.off("order:created", loadData);
        socket.off("order:updated", loadData);
        socket.off("payment:completed", loadData);
        socket.off("NEW_PRINT_JOB");
      }
    };
  }, [socket, loadData, loadOnlineStaff]);

  useEffect(() => {
    if (socket && floorData.activeFloorId) {
      socket.emit("join", `floor:${floorData.activeFloorId}`);
    }
  }, [socket, floorData.activeFloorId]);

  // Helper: get the current employee's MongoDB _id as a string for reliable comparison
  const currentUserId =
    currentUser?._id?.toString() || currentUser?.id?.toString() || null;

  const handleTableClick = (table) => {
    const session = floorData.sessions.find(
      (s) => s.tableId === table.id?.toString(),
    );
    const isAdmin = isSalesAdminRole(currentUser?.role);
    // Reliable comparison: session owner uses MongoDB _id
    const isMineSession =
      session && session.assignedEmployeeId === currentUserId;

    if (!session) {
      setSelectedTable(table);
      setGuestCount(table.seats || 2);
      setShowStartSession(true);
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
        body: JSON.stringify({
          tableId: selectedTable.id,
          guestCount: parseInt(guestCount, 10),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Table assigned");
        setShowStartSession(false);
        setSelectedTable(null);
        const sessionId =
          json.data?._id?.toString() || json.data?.id?.toString();
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
          releaseReason: payload?.releaseReason,
        }),
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
        if (
          json.message &&
          json.message.includes("Cannot release table with unpaid")
        ) {
          if (
            isSalesAdminRole(currentUser?.role) ||
            currentUser?.role === "Manager"
          ) {
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

  const floorWidth =
    floorData.floors.find((f) => f.id === floorData.activeFloorId)?.width ||
    1200;
  const floorHeight =
    floorData.floors.find((f) => f.id === floorData.activeFloorId)?.height ||
    800;
  const tableCount = floorData.tables.length;
  const activeSessionCount = floorData.sessions.length;
  const activeOrderCount = floorData.sessions.filter(
    (s) => s.hasActiveOrder,
  ).length;

  const contentBounds = React.useMemo(() => {
    const tables = floorData.tables || [];
    if (!tables.length) {
      return { width: floorWidth, height: floorHeight, offsetX: 0, offsetY: 0 };
    }
    const pad = 56;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    tables.forEach((t) => {
      minX = Math.min(minX, Number(t.x) || 0);
      minY = Math.min(minY, Number(t.y) || 0);
      maxX = Math.max(maxX, (Number(t.x) || 0) + (Number(t.width) || 80));
      maxY = Math.max(maxY, (Number(t.y) || 0) + (Number(t.height) || 80));
    });
    const offsetX = Math.max(0, minX - pad);
    const offsetY = Math.max(0, minY - pad);
    return {
      width: Math.max(maxX - offsetX + pad, 320),
      height: Math.max(maxY - offsetY + pad, 240),
      offsetX,
      offsetY,
    };
  }, [floorData.tables, floorWidth, floorHeight]);

  // Fit the table cluster to the viewport (ignore unused floor whitespace)
  useEffect(() => {
    const el = floorViewportRef.current;
    if (!el || !contentBounds.width || !contentBounds.height) return;

    const fit = () => {
      const pad = 12;
      const availW = Math.max(el.clientWidth - pad, 200);
      const availH = Math.max(el.clientHeight - pad, 200);
      const next = Math.min(
        availW / contentBounds.width,
        availH / contentBounds.height,
      );
      setScale(Math.min(Math.max(next, 0.35), 3.2));
    };

    fit();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [contentBounds.width, contentBounds.height, floorData.tables.length]);

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
            <h1 className="text-base md:text-lg font-bold text-zinc-900 tracking-tight">
              Floor Operations
            </h1>
            <p className="text-xs md:text-sm font-medium text-zinc-500 mt-0.5">
              {tableCount} Tables • {activeSessionCount} Active
              {activeOrderCount > 0 ? ` • ${activeOrderCount} with orders` : ""}
            </p>
          </div>

          {/* Online staff — count + names */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Users className="h-4 w-4" />
                <span className="font-semibold tabular-nums">
                  {onlineStaff.count} Online
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0 bg-white">
              <div className="border-b border-stone-100 px-3 py-2">
                <p className="text-sm font-semibold text-stone-900">
                  Currently logged in
                </p>
                <p className="text-xs text-stone-500">
                  {onlineStaff.count} staff with an active session
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {onlineStaff.online.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-stone-400">
                    No one online right now.
                  </p>
                ) : (
                  onlineStaff.online.map((emp, idx) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 border text-xs font-bold text-emerald-800">
                        {emp.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900">
                          {idx + 1}. {emp.name}
                        </p>
                        <p className="truncate text-[11px] text-stone-500 uppercase tracking-wide">
                          {emp.role || "Staff"}
                          {emp.employeeId ? ` • ${emp.employeeId}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Mobile legend strip */}
      <div className="sm:hidden shrink-0 border-b border-zinc-200 bg-white px-3 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
        <Button
          type="button"
          size="sm"
          onClick={() => router.push("/sales/orders/walk-in")}
          className="h-7 shrink-0 px-2.5 rounded-md text-[12px] font-semibold bg-orange-600 text-white hover:bg-orange-700"
        >
          <UserPlus className="h-3.5 w-3.5 mr-1 inline" />
          Walk-in
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => router.push("/sales/orders/staff")}
          className="h-7 shrink-0 px-2.5 rounded-md text-[12px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Users className="h-3.5 w-3.5 mr-1 inline" />
          Staff
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            setGridMode((prev) =>
              prev === "lines"
                ? "dots"
                : prev === "dots"
                  ? "none"
                  : "lines",
            )
          }
          className={`h-7 shrink-0 px-2.5 rounded-md text-[12px] font-semibold ${
            gridMode !== "none"
              ? "bg-orange-600 text-white hover:bg-orange-600"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {gridMode === "lines" ? "Lines" : gridMode === "dots" ? "Dots" : "Grid Off"}
        </Button>
        {[
          { label: "Available", className: "bg-white border border-zinc-300" },
          { label: "Serving", className: "bg-sky-400 border border-sky-500" },
          { label: "Ordering", className: "bg-orange-500 border border-orange-600" },
          { label: "Payment", className: "bg-emerald-500 border border-emerald-600" },
          { label: "Booked", className: "bg-red-900 border border-red-500" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 shrink-0">
            <span className={`h-2 w-2 rounded-full ${item.className}`} />
            <span className="text-[11px] font-medium text-zinc-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          ref={floorViewportRef}
          className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden bg-zinc-50/80 p-2 sm:p-3"
        >
          <div
            className="relative shrink-0"
            style={{
              width: contentBounds.width * scale,
              height: contentBounds.height * scale,
            }}
          >
            <div
              className="absolute top-0 left-0 rounded-xl border border-black bg-white shadow-sm overflow-hidden"
              style={{
                width: contentBounds.width,
                height: contentBounds.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {gridMode !== "none" && (
                <div
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{
                    opacity: gridMode === "lines" ? 0.55 : 0.8,
                    backgroundImage:
                      gridMode === "lines"
                        ? "linear-gradient(to right, #9ca3af 1px, transparent 1px), linear-gradient(to bottom, #9ca3af 1px, transparent 1px)"
                        : "radial-gradient(#64748b 2px, transparent 2px)",
                    backgroundSize:
                      gridMode === "lines" ? "40px 40px" : "20px 20px",
                  }}
                />
              )}
              {floorData.tables.map((table) => {
                const tableId = table.id?.toString();
                const session = floorData.sessions.find(
                  (s) => s.tableId === tableId,
                );
                // Live session ownership — TableSession.assignedEmployee is the source of truth
                const isMine =
                  session && session.assignedEmployeeId === currentUserId;
                const isOther = session && !isMine;
                const hasOrder = Boolean(session?.hasActiveOrder);

                let bgClass =
                  "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm";
                let textClass = "text-zinc-900";
                let statusLabel = "AVAILABLE";
                let statusClass = "text-zinc-500";

                if (session?.status === "PAYMENT_PENDING") {
                bgClass =
                  "bg-emerald-100 border-emerald-400 hover:border-emerald-500";
                textClass = "text-emerald-950";
                statusLabel = "PAYMENT";
                statusClass = "text-emerald-700";
              } else if (isOther) {
                bgClass = "bg-red-300 border-red-500 hover:border-red-600";
                textClass = "text-zinc-800";
                statusLabel = "BOOKED";
                statusClass = "text-zinc-600";
              } else if (isMine && hasOrder) {
                bgClass =
                  "bg-orange-100 border-orange-400 hover:border-orange-500";
                textClass = "text-orange-950";
                statusLabel = "ORDERING";
                statusClass = "text-orange-700";
              } else if (isMine) {
                bgClass = "bg-sky-50 border-sky-400 hover:border-sky-500";
                textClass = "text-sky-950";
                statusLabel = "SERVING";
                statusClass = "text-sky-700";
              }

              const employeeFirst =
                session?.assignedEmployeeName?.split(" ")[0] || null;

              return (
                <div
                  key={tableId}
                  onClick={() => handleTableClick(table)}
                  className={`absolute z-10 flex flex-col items-center justify-center border-2 transition-all duration-150 px-2.5 py-2 cursor-pointer ${bgClass} ${table.shape === "round" ? "rounded-full" : "rounded-xl"}`}
                  style={{
                    left:
                      (table.x || 0) -
                      contentBounds.offsetX -
                      (table.width || 80) * 0.1,
                    top:
                      (table.y || 0) -
                      contentBounds.offsetY -
                      (table.height || 80) * 0.1,
                    width: (table.width || 80) * 1.2,
                    height: (table.height || 80) * 1.1,
                    transform: `rotate(${table.rotation}deg)`,
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    className={`text-lg md:text-md font-bold tracking-tight leading-tight ${textClass}`}
                  >
                    {table.tableNumber}
                  </span>

                  <span
                    className={`mt-1.5 text-[11px] md:text-xs font-bold uppercase tracking-wide leading-none ${statusClass}`}
                  >
                    {statusLabel}
                  </span>

                  {session ? (
                    <div className="mt-2 flex items-center gap-1 min-w-0 px-0.5">
                      {employeeFirst && (
                        <span
                          className={`text-xs font-bold truncate max-w-full ${textClass}`}
                        >
                          {employeeFirst}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className={`h-4 w-4 ${statusClass}`} />
                        <span
                          className={`text-sm font-semibold ${statusClass}`}
                        >
                          {session.guestCount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="mt-2 text-xs font-semibold text-zinc-500">
                      {table.seats} seats
                    </span>
                  )}

                  {/* Lock icon for occupied tables owned by other employees */}
                  {isOther && (
                    <div className="absolute -top-1.5 -right-1.5 bg-zinc-700 border-2 border-black rounded-full p-0.5 shadow-sm">
                      <Lock className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Subtle serving indicator for my own active table */}
                  {isMine && (
                    <div
                      className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-black shadow-sm ${hasOrder ? "bg-orange-500" : "bg-sky-500"}`}
                    />
                  )}
                </div>
              );
            })}


          </div>
        </div>
        </div>

        {/* Legend + grid toggle — under Online, parallel to tables */}
        <aside className="hidden sm:flex w-44 shrink-0 flex-col gap-3 border-l border-zinc-200 bg-white p-3 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => router.push("/sales/orders/walk-in")}
              className="h-9 w-full px-3 rounded-lg text-[13px] font-semibold bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
            >
              <UserPlus className="h-4 w-4 mr-1.5 inline" />
              Walking Customer
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/sales/orders/staff")}
              className="h-9 w-full px-3 rounded-lg text-[13px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              <Users className="h-4 w-4 mr-1.5 inline" />
              Staff Order
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg p-1">
            <Button
              type="button"
              variant={gridMode !== "none" ? "secondary" : "ghost"}
              size="sm"
              onClick={() =>
                setGridMode((prev) =>
                  prev === "lines"
                    ? "dots"
                    : prev === "dots"
                      ? "none"
                      : "lines",
                )
              }
              className={`h-8 w-full px-3 rounded-md text-[13px] font-semibold ${
                gridMode !== "none"
                  ? "bg-orange-600 shadow-sm text-white hover:bg-orange-600"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {gridMode === "lines"
                ? "Lines"
                : gridMode === "dots"
                  ? "Dots"
                  : "Grid Off"}
            </Button>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-white border border-zinc-500" />
              <span className="text-sm font-medium text-zinc-900">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-sky-400 border border-sky-500" />
              <span className="text-sm font-medium text-zinc-900">Serving</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-orange-500 border border-orange-600" />
              <span className="text-sm font-medium text-zinc-900">Ordering</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 border border-emerald-600" />
              <span className="text-sm font-medium text-zinc-900">Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-red-500 border border-zinc-500" />
              <span className="text-sm font-medium text-zinc-900">Booked</span>
            </div>
          </div>
        </aside>
      </div>

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
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Seat Guests"
              )}
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
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-4"
                onClick={() => setActionView("MAIN")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 text-center">
              {actionView === "MAIN" && `Table ${selectedTable?.tableNumber}`}
              {actionView === "READONLY" &&
                `Table ${selectedTable?.tableNumber}`}
              {actionView === "GUESTS" && "Adjust Guests / Seats"}
              {actionView === "TRANSFER" && "Transfer Table"}
              {actionView === "RECONFIGURE" && "Temporary Table Setup"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {actionView === "MAIN" && (
              <div className="flex flex-col gap-3">
                <div className="text-center mb-4">
                  <p className="text-sm font-bold text-zinc-900">
                    {floorData.floors.find(
                      (f) => f.id === floorData.activeFloorId,
                    )?.name || "Ground Floor"}
                  </p>
                  <p className="text-sm font-bold text-zinc-900 mt-1">
                    {selectedTable?.session?.guestCount} Guests •{" "}
                    {selectedTable?.session?.effectiveSeatCount ||
                      selectedTable?.seats}{" "}
                    Seats
                  </p>
                  <p className="text-sm font-bold text-zinc-900 mt-1">
                    Assigned to {selectedTable?.session?.assignedEmployeeName}
                  </p>
                  <p className="text-xs font-bold text-zinc-900 mt-1">
                    Open for{" "}
                    {Math.floor(
                      (new Date() -
                        new Date(selectedTable?.session?.openedAt)) /
                        60000,
                    )}{" "}
                    min
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-900 border-2 border-zinc-200 bg-zinc-50 hover:bg-orange-400 hover:text-white"
                  onClick={() =>
                    router.push(`/sales/orders/${selectedTable?.session?.id}`)
                  }
                >
                  <CheckCircle2 className="mr-3 h-5 w-5 text-zinc-600" />
                  {selectedTable?.session?.hasActiveOrder
                    ? "Continue Order"
                    : "Continue Order"}
                </Button>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-700 border-2 border-zinc-200 bg-zinc-50 hover:bg-orange-400 hover:text-white"
                  onClick={() => {
                    setGuestCount(selectedTable?.session?.guestCount || 1);
                    setEffectiveSeatCount(
                      selectedTable?.session?.guestCount ||
                        selectedTable?.seats ||
                        1,
                    );
                    setActionView("GUESTS");
                  }}
                >
                  <Users className="mr-3 h-5 w-5 text-zinc-400" />
                  Adjust Guests / Seats
                </Button>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-700 border-2 border-zinc-200 bg-zinc-50 hover:bg-orange-400 hover:text-white"
                  onClick={() => setActionView("TRANSFER")}
                >
                  <UserPlus className="mr-3 h-5 w-5 text-zinc-400" />
                  Transfer Table
                </Button>

                <Button
                  variant="outline"
                  className="h-14 justify-start px-6 font-bold text-zinc-700 border-2 border-zinc-200 bg-zinc-50 hover:bg-orange-400 hover:text-white"
                  onClick={() => {
                    setEffectiveSeatCount(
                      selectedTable?.session?.effectiveSeatCount ||
                        selectedTable?.seats ||
                        4,
                    );
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
                  {actionLoading ? (
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  ) : (
                    <AlertCircle className="mr-3 h-5 w-5" />
                  )}
                  Release Table
                </Button>
              </div>
            )}

            {actionView === "READONLY" && (
              <div className="flex flex-col gap-3">
                <div className="text-center mb-4">
                  <p className="text-sm font-semibold text-zinc-500">
                    {floorData.floors.find(
                      (f) => f.id === floorData.activeFloorId,
                    )?.name || "Ground Floor"}
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
                    This table is currently being served by{" "}
                    {selectedTable?.session?.assignedEmployeeName}.
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
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
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
                      className="h-12 w-12 rounded-full"
                      onClick={() => setGuestCount(guestCount + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-center block">
                    Effective Seats (Current TableSession only)
                  </label>
                  <div className="flex items-center gap-4 px-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() =>
                        setEffectiveSeatCount(
                          Math.max(1, effectiveSeatCount - 1),
                        )
                      }
                    >
                      -
                    </Button>
                    <div className="flex-1 text-center text-4xl font-black text-zinc-800">
                      {effectiveSeatCount}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() =>
                        setEffectiveSeatCount(effectiveSeatCount + 1)
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    executeAction("UPDATE_GUESTS", {
                      guestCount,
                      effectiveSeatCount,
                    })
                  }
                  disabled={actionLoading}
                  className="h-12 font-bold w-full mt-4"
                >
                  Save Adjustments
                </Button>
              </div>
            )}

            {actionView === "TRANSFER" && (
              <div className="flex flex-col gap-3 py-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {activeEmployees.filter(
                  (emp) => emp.id?.toString() !== currentUserId,
                ).length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-8">
                    No other eligible employees available.
                  </p>
                ) : (
                  activeEmployees
                    .filter((emp) => emp.id?.toString() !== currentUserId)
                    .map((emp) => (
                      <Button
                        key={emp.id}
                        variant="outline"
                        className="h-14 justify-start px-4 font-bold text-zinc-700"
                        onClick={() =>
                          executeAction("TRANSFER", { newEmployeeId: emp.id })
                        }
                        disabled={actionLoading}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center mr-3 border border-zinc-200">
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: emp.color || "#ccc" }}
                          ></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span>{emp.name}</span>
                          <span className="text-[12px] font-semibold text-zinc-900 uppercase">
                            {emp.role}
                          </span>
                        </div>
                      </Button>
                    ))
                )}
              </div>
            )}

            {actionView === "RECONFIGURE" && (
              <div className="flex flex-col gap-6 py-4">
                <p className="text-sm text-zinc-500 text-center">
                  This temporarily changes the seat capacity for the duration of
                  this session without permanently corrupting the Admin floor
                  configuration.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-center block">
                    Session Seat Count
                  </label>
                  <div className="flex items-center gap-4 px-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() =>
                        setEffectiveSeatCount(
                          Math.max(1, effectiveSeatCount - 1),
                        )
                      }
                    >
                      -
                    </Button>
                    <div className="flex-1 text-center text-4xl font-black text-zinc-800">
                      {effectiveSeatCount}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() =>
                        setEffectiveSeatCount(effectiveSeatCount + 1)
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    executeAction("RECONFIGURE", { effectiveSeatCount })
                  }
                  disabled={actionLoading}
                  className="h-12 font-bold w-full mt-4"
                >
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
              There are unpaid orders on this table. To forcefully release it,
              please provide a reason.
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
              onClick={() =>
                executeAction("RELEASE", {
                  adminOverride: true,
                  releaseReason: adminOverrideReason,
                })
              }
              disabled={actionLoading || adminOverrideReason.trim().length < 3}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Force Release"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
