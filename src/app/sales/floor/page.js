"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import {
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  Check,
  Lock,
  ChevronLeft,
  Settings2,
  UserPlus,
  FileEdit,
  Printer,
  Layers,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { employeeFetch } from "@/lib/employeeFetch";
import { isSalesAdminRole } from "@/utils/roles";
import { resolveDocumentId, sessionOwnsTable, formatTableLocation } from "@/utils/orderDisplay";

const SALES_FLOOR_STORAGE_KEY = "sales-active-floor-id";

function readUrlFloorId() {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("floor");
  } catch {
    return null;
  }
}

function readStoredFloorId() {
  if (typeof window === "undefined") return null;
  try {
    const value =
      window.localStorage.getItem(SALES_FLOOR_STORAGE_KEY) ||
      window.sessionStorage.getItem(SALES_FLOOR_STORAGE_KEY) ||
      null;
    if (!value || value === "[object Object]") return null;
    return value;
  } catch {
    return null;
  }
}

function storeFloorId(id) {
  const value = id && String(id) !== "[object Object]" ? String(id) : "";
  try {
    if (value) {
      window.localStorage.setItem(SALES_FLOOR_STORAGE_KEY, value);
      window.sessionStorage.setItem(SALES_FLOOR_STORAGE_KEY, value);
    }
  } catch {
    /* ignore */
  }
}

function findSessionForTable(sessions, tableId) {
  const id = resolveDocumentId(tableId);
  if (!id) return null;
  return (sessions || []).find((session) => sessionOwnsTable(session, id)) || null;
}

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
  const selectedFloorIdRef = React.useRef(readStoredFloorId());
  const hasLoadedRef = React.useRef(false);
  const [selectedFloorId, setSelectedFloorId] = useState(
    selectedFloorIdRef.current,
  );
  const [floorLoading, setFloorLoading] = useState(false);
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
  const [selectedLinkedTableIds, setSelectedLinkedTableIds] = useState([]);
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

  const loadData = useCallback(async (floorIdOverride) => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      else setFloorLoading(true);
      // Fetch user — /api/auth/me returns the Employee or POS Admin document.
      const userRes = await employeeFetch("/api/auth/me");
      const userData = await userRes.json();
      let user = null;
      if (userRes.ok && userData.success && userData.data) {
        user = userData.data.employee || userData.data;
        setCurrentUser(user);
      }

      const preferredFloor =
        resolveDocumentId(floorIdOverride) ||
        resolveDocumentId(readUrlFloorId()) ||
        resolveDocumentId(selectedFloorIdRef.current) ||
        resolveDocumentId(readStoredFloorId()) ||
        resolveDocumentId(user?.defaultFloor) ||
        null;
      const floorQuery = preferredFloor
        ? `?floorId=${encodeURIComponent(String(preferredFloor))}`
        : "";
      const floorRes = await employeeFetch(`/api/sales/floor${floorQuery}`);
      const floorJson = await floorRes.json();
      if (floorRes.ok && floorJson.success && floorJson.data) {
        setFloorData(floorJson.data);
        if (floorJson.data.activeFloorId) {
          const nextId = String(floorJson.data.activeFloorId);
          selectedFloorIdRef.current = nextId;
          setSelectedFloorId(nextId);
          storeFloorId(nextId);
        }
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
      hasLoadedRef.current = true;
      setLoading(false);
      setFloorLoading(false);
    }
  }, [loadOnlineStaff]);

  const reloadCurrentFloor = useCallback(() => {
    loadData(
      selectedFloorIdRef.current ||
        readStoredFloorId() ||
        readUrlFloorId() ||
        undefined,
    );
  }, [loadData]);

  useEffect(() => {
    const stored = readUrlFloorId() || readStoredFloorId();
    if (stored) {
      selectedFloorIdRef.current = stored;
      setSelectedFloorId(stored);
    }
    loadData(stored || undefined);

    const handleReconnect = () => {
      reloadCurrentFloor();
    };

    window.addEventListener("socket:reconnect", handleReconnect);

    // Refresh online list periodically (login/logout has no dedicated socket event yet)
    const onlineTimer = setInterval(loadOnlineStaff, 30000);

    if (socket) {
      socket.on("table:assigned", reloadCurrentFloor);
      socket.on("table:updated", reloadCurrentFloor);
      socket.on("table:released", reloadCurrentFloor);
      socket.on("table:transferred", reloadCurrentFloor);
      socket.on("order:created", reloadCurrentFloor);
      socket.on("order:updated", reloadCurrentFloor);
      socket.on("payment:completed", reloadCurrentFloor);
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
        socket.off("table:assigned", reloadCurrentFloor);
        socket.off("table:updated", reloadCurrentFloor);
        socket.off("table:released", reloadCurrentFloor);
        socket.off("table:transferred", reloadCurrentFloor);
        socket.off("order:created", reloadCurrentFloor);
        socket.off("order:updated", reloadCurrentFloor);
        socket.off("payment:completed", reloadCurrentFloor);
        socket.off("NEW_PRINT_JOB");
      }
    };
  }, [socket, loadData, reloadCurrentFloor, loadOnlineStaff]);

  useEffect(() => {
    if (socket && selectedFloorId) {
      socket.emit("join", `floor:${selectedFloorId}`);
    }
  }, [socket, selectedFloorId]);

  const handleSelectFloor = (floorId) => {
    const nextId = String(floorId || "");
    if (!nextId || nextId === String(selectedFloorIdRef.current || "")) return;
    selectedFloorIdRef.current = nextId;
    setSelectedFloorId(nextId);
    storeFloorId(nextId);
    router.replace(`/sales/floor?floor=${encodeURIComponent(nextId)}`, {
      scroll: false,
    });
    loadData(nextId);
  };

  // Helper: get the current employee's MongoDB _id as a string for reliable comparison
  const currentUserId =
    currentUser?._id?.toString() || currentUser?.id?.toString() || null;

  const primarySessionTableId = resolveDocumentId(
    selectedTable?.session?.tableId || selectedTable?.session?.primaryTable,
  );
  const activePrimaryTableId =
    primarySessionTableId || resolveDocumentId(selectedTable?.id);

  const sumSeatsForTables = (tableIds) => {
    const idSet = new Set((tableIds || []).map((id) => String(id)));
    return (floorData.tables || []).reduce((sum, table) => {
      if (!idSet.has(String(table.id))) return sum;
      return sum + (Number(table.seats) || 0);
    }, 0);
  };

  const combinedSeatTotal = sumSeatsForTables([
    activePrimaryTableId,
    ...selectedLinkedTableIds,
  ]);

  const openReconfigure = () => {
    const linked = (selectedTable?.session?.linkedTableIds || []).map(String);
    setSelectedLinkedTableIds(linked);
    const seatTotal =
      sumSeatsForTables([primarySessionTableId, ...linked]) ||
      selectedTable?.seats ||
      4;
    setEffectiveSeatCount(
      selectedTable?.session?.effectiveSeatCount &&
        selectedTable.session.effectiveSeatCount > seatTotal
        ? selectedTable.session.effectiveSeatCount
        : seatTotal,
    );
    setActionView("RECONFIGURE");
  };

  const toggleLinkedTable = (tableId, extraIds = []) => {
    const idsToToggle = [String(tableId), ...extraIds.map(String)];
    setSelectedLinkedTableIds((prev) => {
      const next = new Set(prev.map(String));
      const shouldSelect = idsToToggle.some((id) => !next.has(id));
      idsToToggle.forEach((id) => {
        if (id === String(activePrimaryTableId || "")) return;
        if (shouldSelect) next.add(id);
        else next.delete(id);
      });
      const selected = [...next];
      setEffectiveSeatCount(
        sumSeatsForTables([activePrimaryTableId, ...selected]) || 1,
      );
      return selected;
    });
  };

  const buildCombineGroups = (primaryId, ownerId) => {
    const available = [];
    const mine = [];
    if (!primaryId) return { available, mine };
    for (const table of floorData.tables || []) {
      const tableId = String(table.id);
      if (tableId === String(primaryId)) continue;
      const session = findSessionForTable(floorData.sessions, tableId);
      if (!session) {
        available.push(table);
        continue;
      }
      const isThisSession =
        selectedTable?.session &&
        String(session.id) === String(selectedTable.session.id);
      const isMine = session.assignedEmployeeId === ownerId;
      if (isThisSession || isMine) {
        mine.push(table);
      }
    }
    return { available, mine };
  };

  const reconfigureGroups = actionView === "RECONFIGURE"
    ? buildCombineGroups(
        primarySessionTableId,
        selectedTable?.session?.assignedEmployeeId || currentUserId,
      )
    : { available: [], mine: [] };

  const startSessionGroups = showStartSession
    ? buildCombineGroups(resolveDocumentId(selectedTable?.id), currentUserId)
    : { available: [], mine: [] };

  const renderCombineTableRows = (groups) => {
    const renderRow = (table) => {
      const tableId = String(table.id);
      const checked = selectedLinkedTableIds.includes(tableId);
      const session = findSessionForTable(floorData.sessions, tableId);
      const isThisSession =
        selectedTable?.session &&
        String(session?.id) === String(selectedTable.session.id);
      const siblingIds = isThisSession
        ? []
        : [session?.tableId, ...(session?.linkedTableIds || [])].filter(
            (id) => id && String(id) !== String(activePrimaryTableId || ""),
          );
      return (
        <button
          key={tableId}
          type="button"
          onClick={() => toggleLinkedTable(tableId, siblingIds)}
          className={`w-full h-12 px-3 rounded-lg border-2 flex items-center gap-3 text-left ${
            checked
              ? "border-orange-400 bg-orange-50"
              : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <span
            className={`grid place-content-center h-4 w-4 rounded-sm border shrink-0 ${
              checked
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-zinc-400 bg-white"
            }`}
          >
            {checked ? <Check className="h-3 w-3" /> : null}
          </span>
          <span className="font-bold text-zinc-800">
            Table {table.tableNumber}
          </span>
          <span className="ml-auto text-xs font-semibold text-zinc-500">
            {table.seats} seats
            {session?.hasActiveOrder ? " · order" : ""}
          </span>
        </button>
      );
    };

    if (!groups.available.length && !groups.mine.length) {
      return (
        <p className="text-center text-sm text-zinc-500 py-3">
          No other tables on this floor can be combined right now.
        </p>
      );
    }

    return (
      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        {groups.available.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Available
            </p>
            {groups.available.map(renderRow)}
          </div>
        )}
        {groups.mine.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Your tables
            </p>
            {groups.mine.map(renderRow)}
          </div>
        )}
      </div>
    );
  };

  const handleTableClick = (table) => {
    const session = findSessionForTable(floorData.sessions, table.id);
    const isAdmin = isSalesAdminRole(currentUser?.role);
    // Reliable comparison: session owner uses MongoDB _id
    const isMineSession =
      session && session.assignedEmployeeId === currentUserId;

    if (!session) {
      setSelectedTable(table);
      setSelectedLinkedTableIds([]);
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
          linkedTableIds: selectedLinkedTableIds,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Table assigned");
        setShowStartSession(false);
        setSelectedLinkedTableIds([]);
        setSelectedTable(null);
        const sessionId =
          json.data?._id?.toString() || json.data?.id?.toString();
        if (sessionId) {
          router.push(`/sales/orders/${sessionId}`);
        } else {
          loadData(selectedFloorIdRef.current);
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
          linkedTableIds: payload?.linkedTableIds,
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
        loadData(selectedFloorIdRef.current);
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

  const activeFloorId = String(selectedFloorId || floorData.activeFloorId || "");
  const activeFloor = floorData.floors.find(
    (f) => String(f.id) === activeFloorId,
  );
  const floorWidth = activeFloor?.width || 1200;
  const floorHeight = activeFloor?.height || 800;
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
              {activeFloor?.name ? `${activeFloor.name} · ` : ""}
              {tableCount} Tables • {activeSessionCount} Active
              {activeOrderCount > 0 ? ` • ${activeOrderCount} with orders` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {floorData.floors.length > 0 && (
              <Select
                value={activeFloorId || undefined}
                onValueChange={handleSelectFloor}
              >
                <SelectTrigger className="h-9 w-[160px] sm:w-[200px] rounded-lg border-stone-200 bg-white text-[13px] font-semibold gap-2">
                  <Layers className="h-4 w-4 shrink-0 text-orange-600" />
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {floorData.floors.map((floor) => (
                    <SelectItem key={String(floor.id)} value={String(floor.id)}>
                      {floor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              className={`h-9 px-3 rounded-lg text-[13px] font-semibold ${
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
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {floorLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
            <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
          </div>
        )}
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
                const session = findSessionForTable(floorData.sessions, tableId);
                // Live session ownership — TableSession.assignedEmployee is the source of truth
                const isMine =
                  session && session.assignedEmployeeId === currentUserId;
                const isOther = session && !isMine;
                const hasOrder = Boolean(session?.hasActiveOrder);
                const isCombined = Boolean(session?.linkedTableIds?.length);

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
              } else if (isMine && isCombined) {
                bgClass =
                  "bg-violet-100 border-violet-400 hover:border-violet-500";
                textClass = "text-violet-950";
                statusLabel = "COMBINED";
                statusClass = "text-violet-700";
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
                    className={`text-lg md:text-[14px] font-bold tracking-tight leading-tight ${textClass}`}
                  >
                    {table.tableNumber}
                  </span>

                  <span
                    className={`mt-1.5 text-[10px] md:text-md font-bold uppercase tracking-wide leading-none ${statusClass}`}
                  >
                    {statusLabel}
                  </span>

                  {session ? (
                    <div className="mt-2 flex flex-col items-center gap-0.5 min-w-0 px-0.5">
                      <div className="flex items-center gap-1">
                        {employeeFirst && (
                          <span
                            className={`text-xs font-bold truncate max-w-full ${textClass}`}
                          >
                            {employeeFirst}
                          </span>
                        )}
                        <Users className={`h-4 w-4 ${statusClass}`} />
                        <span
                          className={`text-sm font-semibold ${statusClass}`}
                        >
                          {session.guestCount}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold ${statusClass}`}>
                        {table.seats} seats
                      </span>
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
                      className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-black shadow-sm ${
                        isCombined
                          ? "bg-violet-500"
                          : hasOrder
                            ? "bg-orange-500"
                            : "bg-sky-500"
                      }`}
                    />
                  )}
                </div>
              );
            })}


          </div>
        </div>
        </div>
      </div>

      {/* Start Session Modal */}
      <Dialog open={showStartSession} onOpenChange={setShowStartSession}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900">
              Table {selectedTable?.tableNumber}
            </DialogTitle>
            <p className="text-sm font-medium text-zinc-500">
              {activeFloor?.name ? `${activeFloor.name} · ` : ""}
              {selectedTable?.seats}-seat table
            </p>
          </DialogHeader>
          <div className="space-y-5 py-2">
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
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-center">
                Combine tables
              </p>
              <p className="text-xs text-zinc-500 text-center">
                Optional. Select extra empty tables or your booked tables for
                this one party.
              </p>
              {renderCombineTableRows(startSessionGroups)}
            </div>

            <p className="text-center text-sm font-semibold text-zinc-600">
              {guestCount} guest{guestCount === 1 ? "" : "s"} · {combinedSeatTotal || selectedTable?.seats || 0} combined seats
              {guestCount > (combinedSeatTotal || selectedTable?.seats || 0)
                ? " · party is larger than seats"
                : ""}
            </p>
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
              {actionView === "MAIN" &&
                formatTableLocation(
                  selectedTable?.session?.tableNumbers ||
                    selectedTable?.tableNumber,
                  activeFloor?.name,
                )}
              {actionView === "READONLY" &&
                formatTableLocation(
                  selectedTable?.session?.tableNumbers ||
                    selectedTable?.tableNumber,
                  activeFloor?.name,
                )}
              {actionView === "GUESTS" && "Adjust Guests"}
              {actionView === "TRANSFER" && "Transfer Table"}
              {actionView === "RECONFIGURE" && "Temporary Table Setup"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {actionView === "MAIN" && (
              <div className="flex flex-col gap-3">
                <div className="text-center mb-4">
                  <p className="text-sm font-bold text-zinc-900">
                    {activeFloor?.name || "Floor"}
                  </p>
                  <p className="text-sm font-bold text-zinc-900 mt-1">
                    {selectedTable?.session?.guestCount} guests in party •{" "}
                    {selectedTable?.session?.effectiveSeatCount ||
                      selectedTable?.seats}{" "}
                    combined seats
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
                    setActionView("GUESTS");
                  }}
                >
                  <Users className="mr-3 h-5 w-5 text-zinc-400" />
                  Adjust Guests
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
                  onClick={openReconfigure}
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
                    {activeFloor?.name || "Floor"}
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
                    Guests
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
                  <p className="text-center text-xs text-zinc-500 pt-1">
                    Party size for this one check. Combined table seats:{" "}
                    {selectedTable?.session?.effectiveSeatCount ||
                      selectedTable?.seats ||
                      "—"}
                    . This table has {selectedTable?.seats || "—"} chairs.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    executeAction("UPDATE_GUESTS", {
                      guestCount: parseInt(guestCount, 10),
                    })
                  }
                  disabled={actionLoading}
                  className="h-12 font-bold w-full mt-4"
                >
                  Save Guests
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
              <div className="flex flex-col gap-5 py-2">
                <p className="text-sm text-zinc-500 text-center">
                  Combine empty tables or your booked tables into this session
                  for one order. Seat count is temporary and does not change the
                  admin floor plan.
                </p>

                {primarySessionTableId && (
                  <div className="rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                      Primary table
                    </p>
                    <p className="text-sm font-bold text-zinc-900 mt-0.5">
                      Table{" "}
                      {(floorData.tables || []).find(
                        (table) => String(table.id) === String(primarySessionTableId),
                      )?.tableNumber || selectedTable?.tableNumber}{" "}
                      ·{" "}
                      {(floorData.tables || []).find(
                        (table) => String(table.id) === String(primarySessionTableId),
                      )?.seats || selectedTable?.seats || "—"}{" "}
                      seats · locked
                    </p>
                  </div>
                )}

                {renderCombineTableRows(reconfigureGroups)}

                <p className="text-center text-xs font-semibold text-zinc-600">
                  Combined seats: {combinedSeatTotal || selectedTable?.seats || 0}
                  {selectedTable?.session?.guestCount
                    ? ` · ${selectedTable.session.guestCount} guests in party`
                    : ""}
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-center block">
                    Extra chairs (optional)
                  </label>
                  <p className="text-xs text-zinc-500 text-center">
                    Defaults to combined table seats. Raise only if you add extra
                    chairs. This is not the guest count.
                  </p>
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
                    executeAction("RECONFIGURE", {
                      effectiveSeatCount,
                      linkedTableIds: selectedLinkedTableIds,
                    })
                  }
                  disabled={actionLoading}
                  className="h-12 font-bold w-full mt-2"
                >
                  Confirm Table Setup
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
