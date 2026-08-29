"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Printer,
  Pencil,
  Trash2,
  Wifi,
  Send,
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

const EMPTY_FORM = {
  name: "",
  target: "KITCHEN",
  host: "",
  port: "9100",
  enabled: true,
};

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
  }, [fetchPrinters]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const handleEdit = (printer) => {
    setEditId(printer._id);
    setForm({
      name: printer.name || "",
      target: printer.target || "KITCHEN",
      host: printer.host || "",
      port: String(printer.port || 9100),
      enabled: printer.enabled !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.host.trim()) {
      return toast.error("Name and IP address are required.");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        target: form.target,
        host: form.host.trim(),
        port: Number(form.port) || 9100,
        enabled: form.enabled,
      };

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

  const handleTestPrint = async (printer) => {
    setTestingId(printer._id);
    try {
      const res = await fetch(`/api/admin/printers/${printer._id}/test`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        return toast.error(json.message || "Test print failed to send");
      }
      toast.success(json.message || "Test print sent to desktop POS");
    } catch {
      toast.error("Test print failed");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Printer Configuration
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Map kitchen, bar, and receipt printers by IP. When staff send a KOT,
          the sales print queue routes it to the matching target automatically.
          Printing runs on the Tasty Bites POS desktop app on your restaurant
          network.
        </p>
      </div>

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
                placeholder="Kitchen Epson"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Print target</Label>
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
              <Label htmlFor="host">IP address / host</Label>
              <Input
                id="host"
                placeholder="192.168.1.50"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
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
                onChange={(e) => setForm({ ...form, port: e.target.value })}
              />
            </div>
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
              No printers configured yet. Add a kitchen printer to start routing
              KOT tickets automatically.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((printer) => (
                  <TableRow key={printer._id}>
                    <TableCell className="font-medium">
                      {printer.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TARGET_LABELS[printer.target] || printer.target}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Wifi className="h-3.5 w-3.5 text-slate-400" />
                        {printer.host}:{printer.port}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          printer.enabled
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                        }
                      >
                        {printer.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!printer.enabled || testingId === printer._id}
                          onClick={() => handleTestPrint(printer)}
                        >
                          {testingId === printer._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete printer?"
        description={`Remove ${deleteTarget?.name || "this printer"} from configuration.`}
      />
    </div>
  );
}
