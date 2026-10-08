"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bluetooth,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Trash2,
  Usb,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeleteDialog from "@/components/common/DeleteDialog";
import NetworkErrorPanel from "@/components/common/NetworkErrorPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { employeeFetch } from "@/lib/employeeFetch";
import {
  scanSubnetForPrinters,
  subnetPrefixFromHost,
} from "@/lib/printing/networkScan";
import { canManagePrinters } from "@/utils/floorRoles";

const TARGET_LABELS = {
  KITCHEN: "Kitchen (KOT)",
  COUNTER: "Bar / Counter",
  RECEIPT: "Customer Receipt",
};

const ORDER_TYPE_OPTIONS = [
  { value: "TAKE_AWAY", label: "Take away" },
  { value: "DINE_IN", label: "Dine In" },
  { value: "DELIVERY", label: "Delivery" },
];

const PAPER_SIZES = [58, 72, 78, 80];

const PRINT_BRIDGE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_PRINT_BRIDGE_URL) ||
  "http://127.0.0.1:9105";

const BUILTIN_SYSTEM_NAME = "BUILTIN";

const EMPTY_FORM = {
  name: "",
  target: "RECEIPT",
  /** NETWORK | BLUETOOTH | USB | BUILTIN_USB */
  connection: "NETWORK",
  host: "",
  port: "9100",
  bluetoothAddress: "",
  systemPrinterName: "",
  paperWidthMm: 80,
  orderTypes: ["TAKE_AWAY", "DINE_IN", "DELIVERY"],
  enabled: true,
};

function isBuiltInUsb(printer) {
  if (String(printer?.connectionType || "").toUpperCase() !== "USB") return false;
  const sys = String(printer?.systemPrinterName || "").trim().toUpperCase();
  return (
    sys === "BUILTIN" ||
    sys === "ANDROID_BUILTIN" ||
    sys === "ANDROID-BUILTIN"
  );
}

function formConnectionFromPrinter(printer) {
  const conn = String(printer?.connectionType || "").toUpperCase();
  if (conn === "BLUETOOTH") return "BLUETOOTH";
  if (isBuiltInUsb(printer)) return "BUILTIN_USB";
  if (conn === "USB") return "USB";
  return "NETWORK";
}

function connectionLabel(printer) {
  if (isBuiltInUsb(printer)) {
    return `Built-in USB (${printer.systemPrinterName || "BUILTIN"})`;
  }
  const conn = String(printer?.connectionType || "").toUpperCase();
  if (conn === "BLUETOOTH") {
    return `Bluetooth ${printer.bluetoothAddress || ""}`.trim();
  }
  if (conn === "USB") {
    return printer.systemPrinterName || "USB (Windows bridge)";
  }
  if (printer?.host) {
    return `${printer.host}:${printer.port || 9100}`;
  }
  return conn || "—";
}

function statusFromPrinter(printer) {
  if (printer.enabled === false) {
    return { label: "Off", tone: "muted" };
  }
  const reach = printer.lastReachability;
  if (reach?.status === "reachable") {
    return { label: "Online", tone: "good" };
  }
  if (reach?.status === "unreachable") {
    return { label: "Offline", tone: "bad", error: reach.error };
  }
  return { label: "Unknown", tone: "muted" };
}

function toneClass(tone) {
  if (tone === "good") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (tone === "bad") return "bg-red-100 text-red-800 border-red-200";
  return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

export default function SalesPrintersPage() {
  const { user } = useAuth();
  const canEdit = canManagePrinters(user?.role);

  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState("unknown");
  const [bridgePrinters, setBridgePrinters] = useState([]);
  const [scanPrefix, setScanPrefix] = useState("192.168.1");
  const [scanningNet, setScanningNet] = useState(false);
  const [discoveredNet, setDiscoveredNet] = useState([]);
  const [refreshingUsb, setRefreshingUsb] = useState(false);

  const loadPrinters = useCallback(async () => {
    try {
      setLoadError(null);
      const path = canEdit ? "/api/admin/printers" : "/api/sales/printers";
      const res = await employeeFetch(path);
      const json = await res.json();
      if (!json.success) {
        const msg = json.message || "Failed to load printers";
        setLoadError(msg);
        toast.error(msg);
        return;
      }
      setPrinters(json.data || []);
    } catch {
      setLoadError("Failed to load printers");
      toast.error("Failed to load printers");
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  const fetchBridge = useCallback(async () => {
    try {
      const healthRes = await fetch(`${PRINT_BRIDGE_URL}/health`, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
      });
      if (!healthRes.ok) throw new Error("health failed");
      const health = await healthRes.json();
      if (health?.status !== "ok") throw new Error("not ok");
      setBridgeStatus("ok");
      try {
        const listRes = await fetch(`${PRINT_BRIDGE_URL}/printers`, {
          method: "GET",
          mode: "cors",
          cache: "no-store",
        });
        if (listRes.ok) {
          const list = await listRes.json();
          setBridgePrinters(Array.isArray(list) ? list : []);
        }
      } catch {
        setBridgePrinters([]);
      }
      return "ok";
    } catch {
      setBridgeStatus("down");
      setBridgePrinters([]);
      return "down";
    }
  }, []);

  useEffect(() => {
    void loadPrinters();
    void fetchBridge();
    const t = setInterval(fetchBridge, 15_000);
    return () => clearInterval(t);
  }, [loadPrinters, fetchBridge]);

  const sorted = useMemo(() => {
    const order = { KITCHEN: 0, COUNTER: 1, RECEIPT: 2 };
    return [...printers].sort(
      (a, b) => (order[a.target] ?? 9) - (order[b.target] ?? 9),
    );
  }, [printers]);

  const startNetworkScan = useCallback(async () => {
    const inferred =
      subnetPrefixFromHost(form.host) ||
      subnetPrefixFromHost(sorted.find((p) => p.host)?.host) ||
      scanPrefix;
    const prefix = (inferred || scanPrefix || "192.168.1")
      .trim()
      .replace(/\.$/, "");
    setScanPrefix(prefix);
    setScanningNet(true);
    setDiscoveredNet([]);
    try {
      const found = await scanSubnetForPrinters({
        subnetPrefix: prefix,
        port: Number(form.port) || 9100,
        bridgeUrl: PRINT_BRIDGE_URL,
      });
      setDiscoveredNet(found);
      if (!found.length) {
        toast.message(
          `No printers found on ${prefix}.x — enter the IP manually if needed.`,
        );
      } else {
        toast.success(`Found ${found.length} printer(s) on ${prefix}.x`);
      }
    } catch (err) {
      toast.error(
        err?.message ||
          "LAN scan needs Electron POS or a running local print bridge.",
      );
    } finally {
      setScanningNet(false);
    }
  }, [form.host, form.port, scanPrefix, sorted]);

  const refreshUsbList = useCallback(async () => {
    setRefreshingUsb(true);
    try {
      const status = await fetchBridge();
      if (status === "down") {
        toast.error(
          "Print bridge not running — start it to list Windows USB printers.",
        );
      } else {
        toast.success("USB / Windows printer list refreshed");
      }
    } finally {
      setRefreshingUsb(false);
    }
  }, [fetchBridge]);

  const selectConnection = (connection) => {
    setForm((p) => ({
      ...p,
      connection,
      name:
        connection === "BUILTIN_USB" ? p.name || "Built-in Receipt" : p.name,
      systemPrinterName:
        connection === "BUILTIN_USB"
          ? BUILTIN_SYSTEM_NAME
          : p.systemPrinterName,
    }));
    if (connection === "NETWORK") {
      void startNetworkScan();
    } else if (connection === "USB") {
      void refreshUsbList();
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setDiscoveredNet([]);
    setShowForm(true);
    // Default connection is NETWORK — start LAN discovery like mobile.
    void startNetworkScan();
  };

  const openEdit = (printer) => {
    setEditId(String(printer._id));
    const connection = formConnectionFromPrinter(printer);
    setForm({
      name: printer.name || "",
      target: printer.target || "RECEIPT",
      connection,
      host: printer.host || "",
      port: String(printer.port || 9100),
      bluetoothAddress: printer.bluetoothAddress || "",
      systemPrinterName: printer.systemPrinterName || "",
      paperWidthMm: printer.paperWidthMm || 80,
      orderTypes:
        Array.isArray(printer.orderTypes) && printer.orderTypes.length
          ? [...printer.orderTypes]
          : ["TAKE_AWAY", "DINE_IN", "DELIVERY"],
      enabled: printer.enabled !== false,
    });
    const prefix = subnetPrefixFromHost(printer.host);
    if (prefix) setScanPrefix(prefix);
    setDiscoveredNet([]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    const name = form.name.trim();
    const location =
      form.target === "KITCHEN"
        ? "KITCHEN"
        : form.target === "COUNTER"
          ? "BAR"
          : "COUNTER";
    const shared = {
      name,
      target: form.target,
      purpose: form.target,
      enabled: form.enabled,
      isActive: form.enabled,
      type: "THERMAL",
      location,
      paperWidthMm: form.paperWidthMm,
      orderTypes: form.orderTypes,
    };

    if (form.connection === "BUILTIN_USB") {
      return {
        ...shared,
        connectionType: "USB",
        systemPrinterName: BUILTIN_SYSTEM_NAME,
        host: null,
        ipAddress: null,
        port: null,
        bluetoothAddress: null,
      };
    }
    if (form.connection === "USB") {
      return {
        ...shared,
        connectionType: "USB",
        systemPrinterName: form.systemPrinterName.trim(),
        host: null,
        ipAddress: null,
        port: null,
        bluetoothAddress: null,
      };
    }
    if (form.connection === "BLUETOOTH") {
      return {
        ...shared,
        connectionType: "BLUETOOTH",
        bluetoothAddress: form.bluetoothAddress.trim().toUpperCase(),
        systemPrinterName: form.systemPrinterName.trim() || null,
        host: null,
        ipAddress: null,
        port: null,
      };
    }
    const host = form.host.trim();
    return {
      ...shared,
      connectionType: "NETWORK",
      host,
      ipAddress: host,
      port: Number(form.port) || 9100,
      bluetoothAddress: null,
      systemPrinterName: null,
    };
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Printer name is required.";
    if (form.connection === "NETWORK" && !form.host.trim()) {
      return "IP address is required for Wi‑Fi / Ethernet.";
    }
    if (form.connection === "BLUETOOTH" && !form.bluetoothAddress.trim()) {
      return "Bluetooth MAC address is required.";
    }
    if (form.connection === "USB" && !form.systemPrinterName.trim()) {
      return "Windows system printer name is required for USB.";
    }
    if (!form.orderTypes.length) return "Select at least one order type.";
    return null;
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await employeeFetch(
        editId ? `/api/admin/printers/${editId}` : "/api/admin/printers",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Save failed");
        return;
      }
      toast.success(editId ? "Printer updated" : "Printer saved");
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      await loadPrinters();
    } catch {
      toast.error("Failed to save printer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit || !deleteTarget) return;
    try {
      const res = await employeeFetch(
        `/api/admin/printers/${deleteTarget._id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to remove printer");
        return;
      }
      toast.success("Printer removed");
      if (editId === String(deleteTarget._id)) {
        setShowForm(false);
        setEditId(null);
      }
      await loadPrinters();
    } catch {
      toast.error("Failed to remove printer");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggle = async (printer, enabled) => {
    if (!canEdit) return;
    try {
      const connection = formConnectionFromPrinter(printer);
      const payload = {
        name: printer.name,
        target: printer.target,
        purpose: printer.target,
        type: printer.type || "THERMAL",
        connectionType:
          connection === "BUILTIN_USB"
            ? "USB"
            : connection === "NETWORK"
              ? "NETWORK"
              : connection,
        location: printer.location || null,
        enabled,
        isActive: enabled,
        paperWidthMm: printer.paperWidthMm || 80,
        orderTypes: printer.orderTypes || ["TAKE_AWAY", "DINE_IN", "DELIVERY"],
        systemPrinterName:
          connection === "BUILTIN_USB"
            ? BUILTIN_SYSTEM_NAME
            : printer.systemPrinterName || null,
        host:
          connection === "NETWORK" || connection === "LAN"
            ? printer.host
            : null,
        ipAddress:
          connection === "NETWORK" || connection === "LAN"
            ? printer.host
            : null,
        port:
          connection === "NETWORK" || connection === "LAN"
            ? printer.port || 9100
            : null,
        bluetoothAddress:
          connection === "BLUETOOTH" ? printer.bluetoothAddress : null,
      };
      const res = await employeeFetch(`/api/admin/printers/${printer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to update printer");
        return;
      }
      await loadPrinters();
    } catch {
      toast.error("Failed to update printer");
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleProbe = async (printer) => {
    if (!printer?.enabled) {
      toast.error("Enable the printer before checking connection.");
      return;
    }
    setBusyId(String(printer._id));
    try {
      const res = await employeeFetch(
        `/api/sales/printers/${printer._id}/probe`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to start connection check");
        return;
      }
      toast.message("Checking connection…");
      const requestId = json.data?.requestId;
      const deadline = Date.now() + 10_000;
      let matched = null;
      while (Date.now() < deadline) {
        await sleep(800);
        const listPath = canEdit ? "/api/admin/printers" : "/api/sales/printers";
        const listRes = await employeeFetch(listPath);
        const listJson = await listRes.json();
        if (!listJson.success) continue;
        const list = listJson.data || [];
        setPrinters(list);
        const updated = list.find((p) => String(p._id) === String(printer._id));
        const reach = updated?.lastReachability;
        if (
          reach?.checkedAt &&
          reach.status &&
          reach.status !== "unknown" &&
          (!requestId || reach.requestId === requestId)
        ) {
          matched = reach;
          break;
        }
      }
      if (!matched) {
        toast.error(
          "No on-site POS answered. Keep Sales (mobile or desktop) open on the restaurant Wi‑Fi.",
        );
        return;
      }
      if (matched.status === "reachable") {
        toast.success(`Online${matched.source ? ` (via ${matched.source})` : ""}`);
      } else {
        toast.error(matched.error || "Printer offline");
      }
    } catch (err) {
      toast.error(err?.message || "Connection check failed");
    } finally {
      setBusyId(null);
      void loadPrinters();
    }
  };

  const handleTest = async (printer) => {
    if (!printer?.enabled) {
      toast.error("Enable the printer before testing.");
      return;
    }
    setBusyId(String(printer._id));
    try {
      const conn = formConnectionFromPrinter(printer);
      if (conn === "USB" && !isBuiltInUsb(printer)) {
        if (bridgeStatus !== "ok") {
          toast.error("Local print bridge is not running on this PC.");
          return;
        }
        const res = await fetch(`${PRINT_BRIDGE_URL}/print`, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            printerName: printer.systemPrinterName,
            printType: "RECEIPT",
            test: true,
            target: printer.target,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
          throw new Error(json.error || "Test print failed");
        }
        toast.success(`Test print sent to ${printer.systemPrinterName}`);
        await employeeFetch(`/api/sales/printers/${printer._id}/test`, {
          method: "POST",
        }).catch(() => {});
        return;
      }

      const res = await employeeFetch(
        `/api/sales/printers/${printer._id}/test`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Test print failed");
        return;
      }
      toast.success(json.message || "Test print signal sent");
    } catch (err) {
      toast.error(err?.message || "Test print failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleOrderType = (value) => {
    setForm((prev) => {
      const has = prev.orderTypes.includes(value);
      return {
        ...prev,
        orderTypes: has
          ? prev.orderTypes.filter((t) => t !== value)
          : [...prev.orderTypes, value],
      };
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (loadError && printers.length === 0) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center px-4 py-6">
        <NetworkErrorPanel
          title="Unable to load printers"
          message={loadError}
          onRetry={() => {
            setLoading(true);
            void loadPrinters();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/floor"
            className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Printer settings
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Kitchen KOT, Bar/Counter, and Customer Receipt printers. Connection:
            Wi‑Fi/Ethernet, Bluetooth, USB, or Built-in. Same config as Admin —
            turning a printer Off stops prints and cancels its queued jobs.
          </p>
          {!canEdit ? (
            <p className="mt-2 text-sm text-amber-800">
              You can view status and send a test print. Master Terminal /
              Manager Terminal can add, edit, or remove printers.
            </p>
          ) : (
            <p className="mt-2 text-sm text-emerald-800">
              You can add, edit, and remove printers for this restaurant.
            </p>
          )}
        </div>
        {canEdit ? (
          <Button
            type="button"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add printer
          </Button>
        ) : null}
      </div>

      {bridgeStatus === "ok" ? (
        <Badge className="bg-emerald-100 text-emerald-800">
          Print bridge connected
        </Badge>
      ) : bridgeStatus === "down" ? (
        <Badge className="bg-amber-100 text-amber-900">
          Local print bridge not running (needed for Windows USB)
        </Badge>
      ) : null}

      {!sorted.length ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center text-stone-500">
          No printers configured yet.
          {canEdit
            ? " Add a Kitchen, Bar, or Receipt printer."
            : " Ask a Master or Manager terminal to add one."}
        </div>
      ) : null}

      <div className="space-y-4">
        {sorted.map((printer) => {
          const status = statusFromPrinter(printer);
          const busy = busyId === String(printer._id);
          return (
            <div
              key={printer._id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {TARGET_LABELS[printer.target] || printer.target}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-stone-900">
                    {printer.name}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
                    {String(printer.connectionType || "").toUpperCase() ===
                    "BLUETOOTH" ? (
                      <Bluetooth className="h-3.5 w-3.5" />
                    ) : String(printer.connectionType || "")
                        .toUpperCase()
                        .includes("USB") ? (
                      <Usb className="h-3.5 w-3.5" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5" />
                    )}
                    {connectionLabel(printer)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Paper {printer.paperWidthMm || 80}mm
                    {printer.orderTypes?.length
                      ? ` · ${printer.orderTypes.join(", ")}`
                      : ""}
                  </p>
                  {status.error ? (
                    <p className="mt-1 text-xs text-red-600">{status.error}</p>
                  ) : null}
                </div>
                <Badge className={`border ${toneClass(status.tone)}`}>
                  {status.label}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || !printer.enabled}
                  onClick={() => void handleProbe(printer)}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={busy || !printer.enabled}
                  onClick={() => void handleTest(printer)}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Test printer
                </Button>
                {canEdit ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(printer)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(printer)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-700">
                        Enabled
                      </span>
                      <Switch
                        checked={printer.enabled !== false}
                        onCheckedChange={(v) => void handleToggle(printer, v)}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {canEdit && showForm ? (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">
            {editId ? "Edit printer" : "New printer"}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Kitchen Printer"
              />
            </div>

            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select
                value={form.target}
                onValueChange={(target) => setForm((p) => ({ ...p, target }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connection</Label>
              <Select
                value={form.connection}
                onValueChange={(connection) => selectConnection(connection)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NETWORK">WIFI or Ethernet</SelectItem>
                  <SelectItem value="BLUETOOTH">Bluetooth</SelectItem>
                  <SelectItem value="USB">USB (Windows bridge)</SelectItem>
                  <SelectItem value="BUILTIN_USB">
                    Built-in / Urovo-style
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.connection === "NETWORK" ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Subnet (for scan)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={scanPrefix}
                      onChange={(e) => setScanPrefix(e.target.value)}
                      placeholder="192.168.1"
                      className="max-w-[180px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={scanningNet}
                      onClick={() => void startNetworkScan()}
                    >
                      {scanningNet ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Scanning…
                        </>
                      ) : (
                        <>
                          <Wifi className="mr-2 h-4 w-4" />
                          Scan WIFI/LAN
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-stone-500">
                    Scans{" "}
                    <span className="font-mono">
                      {scanPrefix || "192.168.1"}.1–254
                    </span>{" "}
                    on port {form.port || 9100}. Needs desktop POS or local
                    print bridge.
                  </p>
                  {discoveredNet.length ? (
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-2">
                      {discoveredNet.map((d) => (
                        <button
                          key={`${d.host}:${d.port}`}
                          type="button"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              host: d.host,
                              port: String(d.port || 9100),
                              name: p.name || `LAN ${d.host}`,
                            }))
                          }
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                            form.host === d.host
                              ? "bg-orange-100 text-orange-900"
                              : "hover:bg-white"
                          }`}
                        >
                          <span className="font-mono">
                            {d.host}:{d.port}
                          </span>
                          <span className="text-xs text-stone-500">Select</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>IP address</Label>
                  <Input
                    value={form.host}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, host: e.target.value }))
                    }
                    placeholder="192.168.1.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    value={form.port}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, port: e.target.value }))
                    }
                    placeholder="9100"
                  />
                </div>
              </>
            ) : null}

            {form.connection === "BLUETOOTH" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Bluetooth MAC</Label>
                <Input
                  value={form.bluetoothAddress}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      bluetoothAddress: e.target.value,
                    }))
                  }
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="uppercase"
                />
                <p className="text-xs text-stone-500">
                  Browsers cannot scan Bluetooth. Pair on the Android POS tablet
                  (Printer settings → Scan Bluetooth), then paste the MAC here,
                  or configure fully from mobile.
                </p>
              </div>
            ) : null}

            {form.connection === "USB" ? (
              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Windows USB / system printers</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={refreshingUsb}
                    onClick={() => void refreshUsbList()}
                  >
                    {refreshingUsb ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh USB list
                  </Button>
                </div>
                {bridgePrinters.length ? (
                  <Select
                    value={form.systemPrinterName || undefined}
                    onValueChange={(systemPrinterName) =>
                      setForm((p) => ({
                        ...p,
                        systemPrinterName,
                        name: p.name || systemPrinterName,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select from print bridge" />
                    </SelectTrigger>
                    <SelectContent>
                      {bridgePrinters.map((bp) => (
                        <SelectItem key={bp.name} value={bp.name}>
                          {bp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      value={form.systemPrinterName}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          systemPrinterName: e.target.value,
                        }))
                      }
                      placeholder="EPSON TM-T88"
                    />
                    <p className="text-xs text-stone-500">
                      No printers listed yet. Start the local print bridge, then
                      tap Refresh USB list — or type the Windows printer name.
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {form.connection === "BUILTIN_USB" ? (
              <p className="text-sm text-stone-500 sm:col-span-2">
                Uses the Android POS tablet&apos;s built-in thermal printer
                (saved as BUILTIN). Prefer configuring this from the mobile
                Printers screen on the tablet.
              </p>
            ) : null}

            <div className="space-y-2 sm:col-span-2">
              <Label>Order types</Label>
              <div className="flex flex-wrap gap-2">
                {ORDER_TYPE_OPTIONS.map((opt) => {
                  const active = form.orderTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleOrderType(opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? "border-orange-400 bg-orange-50 text-orange-800"
                          : "border-stone-200 bg-white text-stone-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Paper size (mm)</Label>
              <div className="flex flex-wrap gap-2">
                {PAPER_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, paperWidthMm: size }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      form.paperWidthMm === size
                        ? "border-orange-400 bg-orange-50 text-orange-800"
                        : "border-stone-200 bg-white text-stone-700"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:border-stone-300 data-[state=unchecked]:bg-stone-200 data-[state=unchecked]:hover:border-orange-600 data-[state=unchecked]:hover:bg-stone-800"
                checked={form.enabled}
                onCheckedChange={(enabled) =>
                  setForm((p) => ({ ...p, enabled }))
                }
              />
              <Label>Enabled</Label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : null}

      <DeleteDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
        title="Remove printer?"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.name}? Print jobs stay queued until another printer is configured.`
            : ""
        }
      />
    </div>
  );
}
