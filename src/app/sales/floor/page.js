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
  ShoppingBag,
  UserRound,
  Globe,
  ArrowRight,
  RefreshCw,
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
import { cn } from "@/lib/utils";

const SALES_FLOOR_STORAGE_KEY = "sales-active-floor-id";

const FLOOR_TABLE_LEGEND = [
  { label: "Available", className: "bg-white border border-zinc-400" },
  { label: "Serving", className: "bg-sky-400 border border-sky-500" },
  { label: "Payment", className: "bg-emerald-500 border border-emerald-600" },
  { label: "Ordering", className: "bg-orange-500 border border-orange-600" },
  { label: "Combined", className: "bg-violet-500 border border-violet-600" },
  { label: "Booked", className: "bg-red-500 border border-red-600" },
];

const OPEN_ORDER_STATUSES = new Set(["PENDING", "CONFIRMED"]);

function isFloorOrderPaid(order) {
  return (
    String(order?.paymentStatus || "").toUpperCase() === "PAID" ||
    String(order?.status || "").toUpperCase() === "PAID"
  );
}

function isFloorOrderOpen(order) {
  const status = String(order?.status || "").toUpperCase();
  return OPEN_ORDER_STATUSES.has(status) && !isFloorOrderPaid(order);
}

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
  const [orderAttention, setOrderAttention] = useState({
    walkInUnpaid: 0,
    staffUnpaid: 0,
    onlineOpen: 0,
  });
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
  const [actionView, setActionView] = useState("MAIN"); // MAIN, GUESTS, TRANSFER, TRANSFER_CONFIRM, RECONFIGURE

  // Form States
  const [guestCount, setGuestCount] = useState(1);
  const [effectiveSeatCount, setEffectiveSeatCount] = useState(1);
  const [selectedLinkedTableIds, setSelectedLinkedTableIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingTransferEmployee, setPendingTransferEmployee] = useState(null);

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

  const loadOrderAttention = useCallback(async () => {
    try {
      const res = await employeeFetch("/api/orders/employee?today=true");
      const json = await res.json();
      if (!res.ok || !json.success) return;
      const orders = Array.isArray(json.data) ? json.data : [];
      let walkInUnpaid = 0;
      let staffUnpaid = 0;
      let onlineOpen = 0;
      for (const order of orders) {
        if (!isFloorOrderOpen(order)) continue;
        const source = String(order.source || "").toUpperCase();
        if (source === "WALK_IN") walkInUnpaid += 1;
        else if (source === "STAFF") staffUnpaid += 1;
        else if (source === "ONLINE") onlineOpen += 1;
      }
      setOrderAttention({ walkInUnpaid, staffUnpaid, onlineOpen });
    } catch {
      /* non-blocking */
    }
  }, []);

  const currentUserRef = React.useRef(null);
  currentUserRef.current = currentUser;

  const loadData = useCallback(async (floorIdOverride, options = {}) => {
    const silent = Boolean(options.silent);
    try {
      if (!hasLoadedRef.current) setLoading(true);
      else if (!silent) setFloorLoading(true);

      let user = currentUserRef.current;
      if (!silent || !user) {
        const userRes = await employeeFetch("/api/auth/me");
        const userData = await userRes.json();
        if (userRes.ok && userData.success && userData.data) {
          user = userData.data.employee || userData.data;
          setCurrentUser(user);
          currentUserRef.current = user;
        }
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
      } else if (!silent) {
        toast.error(floorJson.message || "Failed to load floor data");
        return;
      }

      // Heavy side-loads only on full (non-silent) refresh
      if (!silent) {
        const empRes = await employeeFetch("/api/sales/employees");
        const empData = await empRes.json();
        if (empRes.ok && empData.success) {
          setActiveEmployees(empData.data || []);
        }
        await loadOnlineStaff();
        await loadOrderAttention();
      }
    } catch (err) {
      if (!silent) {
        toast.error("Failed to load floor data");
      }
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setFloorLoading(false);
    }
  }, [loadOnlineStaff, loadOrderAttention]);

  const reloadCurrentFloor = useCallback(
    (options = {}) => {
      loadData(
        selectedFloorIdRef.current ||
          readStoredFloorId() ||
          readUrlFloorId() ||
          undefined,
        options,
      );
    },
    [loadData],
  );

  const reloadCurrentFloorRef = React.useRef(reloadCurrentFloor);
  reloadCurrentFloorRef.current = reloadCurrentFloor;

  const reloadDebounceRef = React.useRef(null);
  const scheduleSilentFloorReload = useCallback(() => {
    if (reloadDebounceRef.current) {
      clearTimeout(reloadDebounceRef.current);
    }
    reloadDebounceRef.current = setTimeout(() => {
      reloadCurrentFloorRef.current({ silent: true });
    }, 150);
  }, []);

  useEffect(() => {
    const stored = readUrlFloorId() || readStoredFloorId();
    if (stored) {
      selectedFloorIdRef.current = stored;
      setSelectedFloorId(stored);
    }
    loadData(stored || undefined);

    const handleReconnect = () => {
      scheduleSilentFloorReload();
    };

    window.addEventListener("socket:reconnect", handleReconnect);
    const onlineTimer = setInterval(loadOnlineStaff, 30000);

    return () => {
      window.removeEventListener("socket:reconnect", handleReconnect);
      clearInterval(onlineTimer);
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // Socket events: silent floor-only refresh (no spinner, no /auth/me /employees)
  useEffect(() => {
    if (!socket) return;

    const onFloorEvent = () => {
      scheduleSilentFloorReload();
    };

    const onOrderAttention = () => {
      loadOrderAttention();
      scheduleSilentFloorReload();
    };

    socket.on("table:assigned", onFloorEvent);
    socket.on("table:updated", onFloorEvent);
    socket.on("table:released", onFloorEvent);
    socket.on("table:transferred", onFloorEvent);
    socket.on("order:created", onOrderAttention);
    socket.on("order:updated", onOrderAttention);
    socket.on("payment:completed", onOrderAttention);
    socket.on("NEW_PRINT_JOB", () => {
      toast.message("New print job queued", {
        description: "Open Print Jobs to preview / test.",
      });
    });

    return () => {
      socket.off("table:assigned", onFloorEvent);
      socket.off("table:updated", onFloorEvent);
      socket.off("table:released", onFloorEvent);
      socket.off("table:transferred", onFloorEvent);
      socket.off("order:created", onOrderAttention);
      socket.off("order:updated", onOrderAttention);
      socket.off("payment:completed", onOrderAttention);
      socket.off("NEW_PRINT_JOB");
    };
  }, [socket, scheduleSilentFloorReload, loadOrderAttention]);

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
    router.replace(`/floor?floor=${encodeURIComponent(nextId)}`, {
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
    const isPaidSession = session && session.status === "PAYMENT_PENDING";

    if (!session) {
      setSelectedTable(table);
      setSelectedLinkedTableIds([]);
      setGuestCount(table.seats || 2);
      setShowStartSession(true);
    } else if (isMineSession || isAdmin || isPaidSession) {
      // Occupied by me (or I am admin, or table is paid and ready for release)
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
        if (action === "TRANSFER") {
          setPendingTransferEmployee(null);
        }
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
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 sm:px-5 py-2.5 sm:py-3">
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/sales/walk-in")}
                className="h-8 gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-2.5 text-[12px] font-bold text-orange-800 hover:bg-orange-100 hover:text-orange-900"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Walk-in
                {orderAttention.walkInUnpaid > 0 ? (
                  <span className="ml-0.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-black text-white tabular-nums">
                    {orderAttention.walkInUnpaid}
                  </span>
                ) : null}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/sales/staff")}
                className="h-8 gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 text-[12px] font-bold text-indigo-800 hover:bg-indigo-100 hover:text-indigo-900"
              >
                <UserRound className="h-3.5 w-3.5" />
                Staff
                {orderAttention.staffUnpaid > 0 ? (
                  <span className="ml-0.5 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white tabular-nums">
                    {orderAttention.staffUnpaid}
                  </span>
                ) : null}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/sales/today?tab=ONLINE")}
                className="h-8 gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 text-[12px] font-bold text-sky-800 hover:bg-sky-100 hover:text-sky-900"
              >
                <Globe className="h-3.5 w-3.5" />
                Online
                {orderAttention.onlineOpen > 0 ? (
                  <span className="ml-0.5 rounded-md bg-sky-600 px-1.5 py-0.5 text-[10px] font-black text-white tabular-nums">
                    {orderAttention.onlineOpen}
                  </span>
                ) : null}
              </Button>
            </div>

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
              variant="outline"
              size="sm"
              disabled={floorLoading || loading}
              onClick={() => reloadCurrentFloor()}
              className="h-9 gap-1.5 rounded-lg border-stone-200 bg-white px-3 text-[13px] font-semibold text-stone-700 hover:bg-stone-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${floorLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
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

        <aside className="hidden h-full max-h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-white lg:flex">
          <div className="shrink-0 border-b border-zinc-100 px-4 py-2.5">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
              Needs attention
            </p>
            <p className="mt-0.5 text-sm font-bold text-zinc-900">
              Today’s open orders
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {[
              {
                href: "/sales/walk-in",
                label: "Walk-in unpaid",
                count: orderAttention.walkInUnpaid,
                Icon: ShoppingBag,
                tone: "border-orange-200 bg-orange-50 text-orange-900",
                badge: "bg-orange-500",
              },
              {
                href: "/sales/staff",
                label: "Staff unpaid",
                count: orderAttention.staffUnpaid,
                Icon: UserRound,
                tone: "border-indigo-200 bg-indigo-50 text-indigo-900",
                badge: "bg-indigo-600",
              },
              {
                href: "/sales/today?tab=ONLINE",
                label: "Online open",
                count: orderAttention.onlineOpen,
                Icon: Globe,
                tone: "border-sky-200 bg-sky-50 text-sky-900",
                badge: "bg-sky-600",
              },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors hover:brightness-[0.98]",
                  item.tone,
                )}
              >
                <item.Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1 text-xs font-extrabold">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white",
                    item.count > 0 ? item.badge : "bg-zinc-400",
                  )}
                >
                  {item.count}
                </span>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              </button>
            ))}

            {orderAttention.walkInUnpaid +
              orderAttention.staffUnpaid +
              orderAttention.onlineOpen ===
            0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-800">
                  All clear — no unpaid walk-in, staff, or open online orders.
                </p>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
              Table status
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {FLOOR_TABLE_LEGEND.map((item) => (
                <div key={item.label} className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 rounded-sm border",
                      item.className,
                    )}
                  />
                  <span className="truncate text-[11px] font-semibold text-zinc-600">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
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
      <Dialog
        open={showTableActions}
        onOpenChange={(open) => {
          setShowTableActions(open);
          if (!open) setPendingTransferEmployee(null);
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            {/* Back button: only for sub-views of MAIN, never for READONLY (would allow escalating to full action menu) */}
            {actionView !== "MAIN" && actionView !== "READONLY" && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-4"
                onClick={() => {
                  if (actionView === "TRANSFER_CONFIRM") {
                    setPendingTransferEmployee(null);
                    setActionView("TRANSFER");
                    return;
                  }
                  setActionView("MAIN");
                }}
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
              {actionView === "TRANSFER_CONFIRM" && "Confirm Transfer"}
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

            {actionView === "TRANSFER_CONFIRM" && pendingTransferEmployee && (
              <div className="flex flex-col gap-4 py-2">
                <p className="text-sm font-semibold text-zinc-600 text-center">
                  Transfer{" "}
                  <span className="text-zinc-900">
                    {formatTableLocation(
                      selectedTable?.session?.tableNumbers ||
                        selectedTable?.tableNumber,
                      activeFloor?.name,
                    )}
                  </span>{" "}
                  to{" "}
                  <span className="text-zinc-900">
                    {pendingTransferEmployee.name}
                  </span>
                  ?
                </p>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-2">
                  <p className="text-sm font-semibold text-zinc-700">
                    They can continue the order and collect payment.
                  </p>
                  {selectedTable?.session?.hasActiveOrder ? (
                    <p className="text-sm font-bold text-zinc-900">
                      Order credit and tips stay with{" "}
                      {selectedTable.session.orderTakerName ||
                        selectedTable.session.assignedEmployeeName ||
                        "the employee who took this order"}
                      .
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-zinc-900">
                      Credit and tips will go to whoever takes the order at this
                      table.
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => {
                      setPendingTransferEmployee(null);
                      setActionView("TRANSFER");
                    }}
                    className="flex-1 h-12 font-bold border-zinc-200 text-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={actionLoading}
                    onClick={() =>
                      executeAction("TRANSFER", {
                        newEmployeeId: pendingTransferEmployee.id,
                      })
                    }
                    className="flex-1 h-12 font-bold bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Transfer table"
                    )}
                  </Button>
                </div>
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
                        onClick={() => {
                          setPendingTransferEmployee(emp);
                          setActionView("TRANSFER_CONFIRM");
                        }}
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
