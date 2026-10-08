"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Printer,
  Pencil,
  Trash2,
  Wifi,
  Usb,
  Send,
  AlertCircle,
  Activity,
  Bluetooth,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import DeleteDialog from "@/components/common/DeleteDialog";
import NetworkErrorPanel from "@/components/common/NetworkErrorPanel";

const TARGET_LABELS = {
  KITCHEN: "Kitchen (KOT)",
  COUNTER: "Counter / Bar",
  RECEIPT: "Customer Receipt",
};

const LOCATION_OPTIONS = ["COUNTER", "KITCHEN", "BAR"];

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
  /** UI connection: NETWORK | LAN | USB | USB_BUILTIN | BLUETOOTH */
  connectionType: "USB_BUILTIN",
  systemPrinterName: BUILTIN_SYSTEM_NAME,
  host: "",
  port: "9100",
  bluetoothAddress: "",
  paperWidthMm: 80,
  orderTypes: ["TAKE_AWAY", "DINE_IN", "DELIVERY"],
  location: "COUNTER",
  type: "THERMAL",
  enabled: true,
};

function isUsb(connectionType) {
  const t = String(connectionType || "").toUpperCase();
  return t === "USB" || t === "USB_BUILTIN";
}

function isBuiltInUsb(printerOrConn, systemPrinterName) {
  if (printerOrConn && typeof printerOrConn === "object") {
    if (String(printerOrConn.connectionType || "").toUpperCase() !== "USB") {
      return false;
    }
    const sys = String(printerOrConn.systemPrinterName || "")
      .trim()
      .toUpperCase();
    return (
      sys === "BUILTIN" ||
      sys === "ANDROID_BUILTIN" ||
      sys === "ANDROID-BUILTIN"
    );
  }
  if (String(printerOrConn || "").toUpperCase() === "USB_BUILTIN") return true;
  if (String(printerOrConn || "").toUpperCase() !== "USB") return false;
  const sys = String(systemPrinterName || "").trim().toUpperCase();
  return (
    sys === "BUILTIN" ||
    sys === "ANDROID_BUILTIN" ||
    sys === "ANDROID-BUILTIN"
  );
}

function isWindowsUsb(printer) {
  return isUsb(printer?.connectionType) && !isBuiltInUsb(printer);
}

function isNetwork(connectionType) {
  const t = String(connectionType || "LAN").toUpperCase();
  return t === "LAN" || t === "NETWORK";
}

/** Map DB printer → form connectionType value */
function formConnectionFromPrinter(printer) {
  if (isBuiltInUsb(printer)) return "USB_BUILTIN";
  const conn = String(printer.connectionType || "").toUpperCase();
  if (conn === "BLUETOOTH") return "BLUETOOTH";
  return printer.connectionType || "LAN";
}

function connectionLabel(printer) {
  if (isBuiltInUsb(printer)) return "Built-in USB (Android POS)";
  if (isWindowsUsb(printer)) return "USB (Windows bridge)";
  if (String(printer?.connectionType || "").toUpperCase() === "BLUETOOTH") {
    return `Bluetooth ${printer.bluetoothAddress || ""}`.trim();
  }
  return printer.connectionType || "LAN";
}

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [probingId, setProbingId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState("unknown"); // ok | down | unknown
  const [bridgePrinters, setBridgePrinters] = useState([]);

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
    } catch {
      setBridgeStatus("down");
      setBridgePrinters([]);
    }
  }, []);

  const fetchPrinters = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch("/api/admin/printers");
      const json = await res.json();
      if (json.success) {
        setPrinters(json.data || []);
      } else {
        const msg = json.message || "Failed to load printers";
        setLoadError(msg);
        toast.error(msg);
      }
    } catch {
      setLoadError("Failed to load printers");
      toast.error("Failed to load printers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrinters();
    fetchBridge();
    const t = setInterval(fetchBridge, 15_000);
    return () => clearInterval(t);
  }, [fetchPrinters, fetchBridge]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const handleEdit = (printer) => {
    setEditId(printer._id);
    const conn = formConnectionFromPrinter(printer);
    setForm({
      name: printer.name || "",
      target: printer.target || "RECEIPT",
      connectionType: conn,
      systemPrinterName:
        conn === "USB_BUILTIN"
          ? BUILTIN_SYSTEM_NAME
          : printer.systemPrinterName || "",
      host: printer.host || "",
      port: String(printer.port || 9100),
      bluetoothAddress: printer.bluetoothAddress || "",
      paperWidthMm: printer.paperWidthMm || 80,
      orderTypes:
        Array.isArray(printer.orderTypes) && printer.orderTypes.length
          ? [...printer.orderTypes]
          : ["TAKE_AWAY", "DINE_IN", "DELIVERY"],
      location: printer.location || "COUNTER",
      type: printer.type || "THERMAL",
      enabled: printer.enabled !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleSave = async () => {
    if (!form.name.trim()) {
      return toast.error("Printer name is required.");
    }
    const builtIn = form.connectionType === "USB_BUILTIN";
    const windowsUsb = form.connectionType === "USB";
    const bluetooth = form.connectionType === "BLUETOOTH";
    if (windowsUsb && !form.systemPrinterName.trim()) {
      return toast.error("Windows system printer name is required for USB.");
    }
    if (bluetooth && !form.bluetoothAddress.trim()) {
      return toast.error("Bluetooth MAC address is required.");
    }
    if (isNetwork(form.connectionType) && !form.host.trim()) {
      return toast.error("IP address is required for network printers.");
    }
    if (!form.orderTypes.length) {
      return toast.error("Select at least one order type.");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        target: form.target,
        purpose: form.target,
        type: form.type || "THERMAL",
        connectionType: builtIn || windowsUsb ? "USB" : form.connectionType,
        location: form.location || null,
        enabled: form.enabled,
        isActive: form.enabled,
        paperWidthMm: form.paperWidthMm || 80,
        orderTypes: form.orderTypes,
      };

      if (builtIn) {
        payload.systemPrinterName = BUILTIN_SYSTEM_NAME;
        payload.host = null;
        payload.port = null;
        payload.bluetoothAddress = null;
      } else if (windowsUsb) {
        payload.systemPrinterName = form.systemPrinterName.trim();
        payload.host = null;
        payload.port = null;
        payload.bluetoothAddress = null;
      } else if (bluetooth) {
        payload.bluetoothAddress = form.bluetoothAddress.trim().toUpperCase();
        payload.host = null;
        payload.port = null;
        payload.systemPrinterName = null;
      } else {
        payload.host = form.host.trim();
        payload.ipAddress = form.host.trim();
        payload.port = Number(form.port) || 9100;
        payload.systemPrinterName = form.systemPrinterName.trim() || null;
        payload.bluetoothAddress = null;
      }

      const res = await fetch(
        editId ? `/api/admin/printers/${editId}` : "/api/admin/printers",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();

      if (!json.success) {
        return toast.error(json.message || "Failed to save printer");
      }

      toast.success(editId ? "Printer updated" : "Printer added");
      resetForm();
      fetchPrinters();
    } catch {
      toast.error("Failed to save printer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/printers/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        return toast.error(json.message || "Failed to delete printer");
      }
      toast.success("Printer deleted");
      if (editId === deleteTarget._id) resetForm();
      fetchPrinters();
    } catch {
      toast.error("Failed to delete printer");
    } finally {
      setDeleteTarget(null);
    }
  };

  const resolveLiveStatus = (printer) => {
    if (!printer.enabled) return { label: "Off", tone: "muted" };
    if (probingId === printer._id) {
      return { label: "Checking", tone: "muted" };
    }

    const reach = printer.lastReachability;
    if (reach?.status === "reachable" && reach?.checkedAt) {
      return { label: "Online", tone: "good", detail: reach };
    }
    if (reach?.status === "unreachable" && reach?.checkedAt) {
      return {
        label: "Offline",
        tone: "bad",
        detail: reach,
      };
    }

    if (isBuiltInUsb(printer)) {
      // Built-in USB status comes only from the Android Sales app probe
      return { label: "Unknown", tone: "muted" };
    }

    if (isWindowsUsb(printer)) {
      if (bridgeStatus === "down") {
        return { label: "Offline", tone: "bad" };
      }
      if (bridgeStatus === "unknown") {
        return { label: "Unknown", tone: "muted" };
      }
      const sys = printer.systemPrinterName;
      const match = bridgePrinters.find(
        (p) =>
          p.name?.toLowerCase() === String(sys || "").toLowerCase(),
      );
      if (match) return { label: "Online", tone: "good" };
      return { label: "Offline", tone: "bad" };
    }

    return { label: "Unknown", tone: "muted" };
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleCheckConnection = async (printer) => {
    if (!printer?.enabled) {
      return toast.error("Turn the printer on before checking connection.");
    }
    setProbingId(printer._id);
    try {
      const res = await fetch(`/api/admin/printers/${printer._id}/probe`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        return toast.error(json.message || "Failed to start connection check");
      }

      const requestId = json.data?.requestId;
      toast.message("Checking connection…", {
        description:
          "Waiting for sales APK, desktop POS, or print bridge on the restaurant network.",
      });

      const deadline = Date.now() + 10_000;
      let matched = null;
      while (Date.now() < deadline) {
        await sleep(800);
        const listRes = await fetch("/api/admin/printers");
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
          "No on-site POS answered. Open the sales APK or desktop POS on the restaurant Wi‑Fi, then try again.",
        );
        return;
      }

      if (matched.status === "reachable") {
        toast.success(
          `Online${matched.source ? ` (via ${matched.source})` : ""}`,
        );
      } else {
        toast.error(
          matched.error ||
            "Printer offline from the on-site POS (check IP, Wi‑Fi, and power).",
        );
      }
    } catch (err) {
      toast.error(err?.message || "Connection check failed");
    } finally {
      setProbingId(null);
      fetchPrinters();
    }
  };

  const handleToggleEnabled = async (printer, enabled) => {
    try {
      const payload = {
        name: printer.name,
        target: printer.target,
        purpose: printer.target,
        type: printer.type || "THERMAL",
        connectionType: printer.connectionType || "LAN",
        location: printer.location || null,
        enabled,
        isActive: enabled,
        paperWidthMm: printer.paperWidthMm || 80,
        orderTypes: printer.orderTypes || ["TAKE_AWAY", "DINE_IN", "DELIVERY"],
        systemPrinterName: printer.systemPrinterName || null,
        bluetoothAddress: printer.bluetoothAddress || null,
        host: printer.host || null,
        ipAddress: printer.host || null,
        port: printer.port || 9100,
      };

      const res = await fetch(`/api/admin/printers/${printer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        return toast.error(json.message || "Failed to update printer");
      }
      toast.success(enabled ? "Printer turned on" : "Printer turned off");
      if (editId === printer._id) {
        setForm((prev) => ({ ...prev, enabled }));
      }
      fetchPrinters();
    } catch {
      toast.error("Failed to update printer");
    }
  };

  const handleTestPrint = async (printer) => {
    setTestingId(printer._id);
    try {
      // Windows spooler USB only — built-in Android uses socket PRINTER_TEST like network
      if (isWindowsUsb(printer)) {
        if (bridgeStatus !== "ok") {
          toast.error("Local printer service is not running.");
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
        await fetch(`/api/admin/printers/${printer._id}/test`, {
          method: "POST",
        }).catch(() => {});
        return;
      }

      const res = await fetch(`/api/admin/printers/${printer._id}/test`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        return toast.error(json.message || "Test print failed to send");
      }
      toast.success(
        json.message ||
          (isBuiltInUsb(printer)
            ? "Test print signal sent. Keep the Android Sales app open on the POS tablet."
            : "Test print signal sent. Use Check connection to verify reachability; keep sales APK or desktop POS open to print."),
      );
    } catch (err) {
      toast.error(err?.message || "Test print failed");
    } finally {
      setTestingId(null);
    }
  };

  const builtInForm = form.connectionType === "USB_BUILTIN";
  const windowsUsbForm = form.connectionType === "USB";
  const bluetoothForm = form.connectionType === "BLUETOOTH";
  const enabledPrinters = printers.filter((p) => p.enabled !== false);
  const singlePrinterDefault = enabledPrinters.length === 1;

  if (loadError && printers.length === 0 && !loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <NetworkErrorPanel
          title="Unable to load printers"
          message={loadError}
          onRetry={() => {
            setLoading(true);
            void fetchPrinters();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Printer Configuration
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          One printer list is shared by{" "}
          <span className="font-medium text-slate-700">Admin</span>,{" "}
          <span className="font-medium text-slate-700">Sales Web</span>, and{" "}
          <span className="font-medium text-slate-700">Mobile Sales</span>{" "}
          (same database). Configure Built-in USB, NETWORK / Wi‑Fi, Bluetooth,
          or Windows USB. Set paper width and order types to match Sales. Only
          one printer per Target (Kitchen / Counter / Receipt). Turning a
          printer Off cancels its queued jobs and stops new prints to it.
        </p>
      </div>

      {singlePrinterDefault && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">Only printer — </span>
          all KOT, bar, and receipt jobs print to{" "}
          <span className="font-medium">{enabledPrinters[0].name}</span>.
          Add another enabled printer to route by Target again.
        </div>
      )}
      {!loading && enabledPrinters.length > 1 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Multiple printers enabled — each job uses the printer whose{" "}
          <span className="font-medium">Target</span> matches (Kitchen / Counter /
          Receipt).
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-sm">
            {bridgeStatus === "ok" ? (
              <Badge className="bg-emerald-100 text-emerald-800">
                Print bridge connected
              </Badge>
            ) : bridgeStatus === "down" ? (
              <Badge className="bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Local printer service is not running.
              </Badge>
            ) : (
              <Badge className="bg-zinc-100 text-zinc-600">
                Checking print bridge…
              </Badge>
            )}
            <span className="text-xs text-slate-400 font-mono">
              {PRINT_BRIDGE_URL}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchBridge}>
            Refresh status
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5 text-orange-500" />
            {editId ? "Edit Printer" : "Add Printer"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Printer name</Label>
              <Input
                id="name"
                placeholder="Receipt Printer"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Print target (purpose)</Label>
              <Select
                value={form.target}
                onValueChange={(value) => setForm({ ...form, target: value })}
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
              <Label>Connection type</Label>
              <Select
                value={form.connectionType}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    connectionType: value,
                    systemPrinterName:
                      value === "USB_BUILTIN"
                        ? BUILTIN_SYSTEM_NAME
                        : value === "USB"
                          ? form.systemPrinterName === BUILTIN_SYSTEM_NAME
                            ? ""
                            : form.systemPrinterName
                          : form.systemPrinterName,
                    name:
                      value === "USB_BUILTIN" && !form.name.trim()
                        ? "Built-in Receipt"
                        : form.name,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USB_BUILTIN">
                    Built-in USB (Android POS tablet)
                  </SelectItem>
                  <SelectItem value="NETWORK">NETWORK / Wi‑Fi</SelectItem>
                  <SelectItem value="LAN">LAN (legacy alias)</SelectItem>
                  <SelectItem value="USB">USB (Windows print bridge)</SelectItem>
                  <SelectItem value="BLUETOOTH">Bluetooth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paper width</Label>
              <Select
                value={String(form.paperWidthMm || 80)}
                onValueChange={(value) =>
                  setForm({ ...form, paperWidthMm: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_SIZES.map((mm) => (
                    <SelectItem key={mm} value={String(mm)}>
                      {mm} mm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={form.location || "COUNTER"}
                onValueChange={(value) => setForm({ ...form, location: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {builtInForm ? (
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm text-slate-600 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Uses the POS tablet&apos;s built-in 80mm printer via USB.
                  System name is stored as{" "}
                  <span className="font-mono text-xs">{BUILTIN_SYSTEM_NAME}</span>
                  . No IP address. Keep the Android Sales app open to print and
                  report Online status.
                </p>
              </div>
            ) : windowsUsbForm ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="systemPrinterName">
                  Windows system printer name
                </Label>
                <Input
                  id="systemPrinterName"
                  placeholder="KPC307-UEWB"
                  value={form.systemPrinterName}
                  onChange={(e) =>
                    setForm({ ...form, systemPrinterName: e.target.value })
                  }
                  list="bridge-printer-names"
                />
                <datalist id="bridge-printer-names">
                  {bridgePrinters.map((p) => (
                    <option key={p.name} value={p.name} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500">
                  Must match the name shown in Windows Settings → Printers.
                  IP address is not used for USB.
                </p>
              </div>
            ) : bluetoothForm ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bluetoothAddress">
                  Bluetooth MAC address
                </Label>
                <Input
                  id="bluetoothAddress"
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={form.bluetoothAddress}
                  onChange={(e) =>
                    setForm({ ...form, bluetoothAddress: e.target.value })
                  }
                />
                <p className="text-xs text-slate-500">
                  Classic Bluetooth address used by the Android Sales app.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="host">IP address / host</Label>
                  <Input
                    id="host"
                    placeholder="192.168.1.50"
                    value={form.host}
                    onChange={(e) =>
                      setForm({ ...form, host: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.port}
                    onChange={(e) =>
                      setForm({ ...form, port: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Order types</Label>
              <div className="flex flex-wrap gap-3">
                {ORDER_TYPE_OPTIONS.map((opt) => {
                  const checked = form.orderTypes.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOrderType(opt.value)}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Enabled</p>
              <p className="text-xs text-slate-500">
                Turned-off printers stay registered. Queued jobs for that
                printer are cancelled immediately and agents will not print to
                it until turned on again.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) =>
                setForm({ ...form, enabled: checked })
              }
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              disabled={submitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editId ? "Update printer" : "Add printer"}
            </Button>
            {editId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Registered printers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : printers.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No printers configured yet. Add Built-in USB for the Android POS
              tablet, or a NETWORK kitchen printer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Paper</TableHead>
                  <TableHead>Address / System</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((printer) => {
                  const live = resolveLiveStatus(printer);
                  return (
                    <TableRow key={printer._id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{printer.name}</span>
                          {singlePrinterDefault &&
                            printer.enabled !== false && (
                              <Badge className="bg-emerald-100 text-emerald-800 font-normal">
                                Default for all jobs
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TARGET_LABELS[printer.target] || printer.target}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {connectionLabel(printer)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {printer.paperWidthMm || 80} mm
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className="inline-flex items-center gap-1">
                          {isBuiltInUsb(printer) ? (
                            <>
                              <Usb className="h-3.5 w-3.5 text-slate-400" />
                              Built-in ({printer.systemPrinterName || "BUILTIN"})
                            </>
                          ) : isUsb(printer.connectionType) ? (
                            <>
                              <Usb className="h-3.5 w-3.5 text-slate-400" />
                              {printer.systemPrinterName || "—"}
                            </>
                          ) : String(printer.connectionType || "").toUpperCase() ===
                            "BLUETOOTH" ? (
                            <>
                              <Bluetooth className="h-3.5 w-3.5 text-slate-400" />
                              {printer.bluetoothAddress || "—"}
                            </>
                          ) : (
                            <>
                              <Wifi className="h-3.5 w-3.5 text-slate-400" />
                              {printer.host}:{printer.port}
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2 items-start">
                          <Badge
                            className={
                              live.tone === "good"
                                ? "bg-emerald-100 text-emerald-800"
                                : live.tone === "bad"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-zinc-100 text-zinc-600"
                            }
                          >
                            {live.label}
                          </Badge>
                          {live.detail?.checkedAt && (
                            <span className="text-[10px] text-slate-400 max-w-[140px] leading-tight">
                              {live.detail.source
                                ? `${live.detail.source} · `
                                : ""}
                              {new Date(live.detail.checkedAt).toLocaleString()}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={printer.enabled !== false}
                              onCheckedChange={(checked) =>
                                handleToggleEnabled(printer, checked)
                              }
                              aria-label={
                                printer.enabled !== false
                                  ? "Turn printer off"
                                  : "Turn printer on"
                              }
                            />
                            <span className="text-xs text-slate-500">
                              {printer.enabled !== false ? "On" : "Off"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Check connection"
                            disabled={
                              !printer.enabled ||
                              probingId === printer._id ||
                              testingId === printer._id
                            }
                            onClick={() => handleCheckConnection(printer)}
                          >
                            {probingId === printer._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">
                              Check
                            </span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Test Print"
                            disabled={
                              !printer.enabled ||
                              testingId === printer._id ||
                              probingId === printer._id
                            }
                            onClick={() => handleTestPrint(printer)}
                          >
                            {testingId === printer._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">
                              Test Print
                            </span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(printer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(printer)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeleteDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete printer?"
        description={`Remove ${deleteTarget?.name || "this printer"} from configuration.`}
      />
    </div>
  );
}
