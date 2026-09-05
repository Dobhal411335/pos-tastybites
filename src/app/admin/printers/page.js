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

const TARGET_LABELS = {
  KITCHEN: "Kitchen (KOT)",
  COUNTER: "Counter / Bar",
  RECEIPT: "Customer Receipt",
};

const LOCATION_OPTIONS = ["COUNTER", "KITCHEN", "BAR"];

const PRINT_BRIDGE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_PRINT_BRIDGE_URL) ||
  "http://127.0.0.1:9105";

const EMPTY_FORM = {
  name: "",
  target: "RECEIPT",
  connectionType: "USB",
  systemPrinterName: "",
  host: "",
  port: "9100",
  location: "COUNTER",
  type: "THERMAL",
  enabled: true,
};

function isUsb(connectionType) {
  return String(connectionType || "").toUpperCase() === "USB";
}

function isNetwork(connectionType) {
  const t = String(connectionType || "LAN").toUpperCase();
  return t === "LAN" || t === "NETWORK";
}

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState(null);
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
      const res = await fetch("/api/admin/printers");
      const json = await res.json();
      if (json.success) {
        setPrinters(json.data || []);
      } else {
        toast.error(json.message || "Failed to load printers");
      }
    } catch {
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
    setForm({
      name: printer.name || "",
      target: printer.target || "RECEIPT",
      connectionType: printer.connectionType || "LAN",
      systemPrinterName: printer.systemPrinterName || "",
      host: printer.host || "",
      port: String(printer.port || 9100),
      location: printer.location || "COUNTER",
      type: printer.type || "THERMAL",
      enabled: printer.enabled !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      return toast.error("Printer name is required.");
    }
    if (isUsb(form.connectionType) && !form.systemPrinterName.trim()) {
      return toast.error("Windows system printer name is required for USB.");
    }
    if (isNetwork(form.connectionType) && !form.host.trim()) {
      return toast.error("IP address is required for network printers.");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        target: form.target,
        purpose: form.target,
        type: form.type || "THERMAL",
        connectionType: form.connectionType,
        location: form.location || null,
        enabled: form.enabled,
        isActive: form.enabled,
      };

      if (isUsb(form.connectionType)) {
        payload.systemPrinterName = form.systemPrinterName.trim();
        payload.host = null;
        payload.port = null;
      } else {
        payload.host = form.host.trim();
        payload.ipAddress = form.host.trim();
        payload.port = Number(form.port) || 9100;
        payload.systemPrinterName = form.systemPrinterName.trim() || null;
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
    if (!printer.enabled) return { label: "Disabled", tone: "muted" };
    if (isUsb(printer.connectionType)) {
      if (bridgeStatus === "down") {
        return { label: "Disconnected", tone: "bad" };
      }
      if (bridgeStatus === "unknown") {
        return { label: "Unknown", tone: "muted" };
      }
      const sys = printer.systemPrinterName;
      const match = bridgePrinters.find(
        (p) =>
          p.name?.toLowerCase() === String(sys || "").toLowerCase(),
      );
      if (match) return { label: "Connected", tone: "good" };
      return { label: "Disconnected", tone: "bad" };
    }
    // Network: registered + enabled — live ping is Electron/desktop side
    return { label: "Unknown", tone: "muted" };
  };

  const handleTestPrint = async (printer) => {
    setTestingId(printer._id);
    try {
      if (isUsb(printer.connectionType)) {
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
        // Also notify bridge listeners via backend (optional redundancy)
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
      toast.success(json.message || "Test print sent to desktop POS");
    } catch (err) {
      toast.error(err?.message || "Test print failed");
    } finally {
      setTestingId(null);
    }
  };

  const usbForm = isUsb(form.connectionType);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Printer Configuration
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Configure USB (local print bridge) or network thermal printers. USB
          printers use the Windows system name — no IP required
        </p>
      </div>

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
                  setForm({ ...form, connectionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USB">USB</SelectItem>
                  <SelectItem value="NETWORK">NETWORK</SelectItem>
                  <SelectItem value="LAN">LAN (legacy)</SelectItem>
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

            {usbForm ? (
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
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Enabled</p>
              <p className="text-xs text-slate-500">
                Disabled printers are ignored by the print queue.
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
              No printers configured yet. Add a USB receipt printer
              (KPC307-UEWB) to start Milestone 1 testing.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Connection</TableHead>
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
                        {printer.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TARGET_LABELS[printer.target] || printer.target}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {printer.connectionType || "LAN"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className="inline-flex items-center gap-1">
                          {isUsb(printer.connectionType) ? (
                            <>
                              <Usb className="h-3.5 w-3.5 text-slate-400" />
                              {printer.systemPrinterName || "—"}
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
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Test Print"
                            disabled={
                              !printer.enabled || testingId === printer._id
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
