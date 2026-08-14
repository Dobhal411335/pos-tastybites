"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Edit, DollarSign, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import DeleteDialog from "@/components/common/DeleteDialog";

const emptyForm = { name: "", amountValue: "", percentValue: "" };

export default function ServiceTaxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/tax/servicetax");
      const json = await res.json();
      if (json.success) setItems(json.data || []);
    } catch {
      toast.error("Failed to load service tax");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onAmountChange = (raw) => {
    setForm((prev) => ({
      ...prev,
      amountValue: raw,
      percentValue: raw !== "" ? "" : prev.percentValue,
    }));
  };

  const onPercentChange = (raw) => {
    setForm((prev) => ({
      ...prev,
      percentValue: raw,
      amountValue: raw !== "" ? "" : prev.amountValue,
    }));
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      name: item.name || "",
      amountValue: item.type === "Amount" ? String(item.value) : "",
      percentValue: item.type === "Percent" ? String(item.value) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const hasAmount = form.amountValue !== "";
    const hasPercent = form.percentValue !== "";

    if (!name) return toast.error("Enter a service charge name.");
    if (hasAmount === hasPercent) {
      return toast.error("Enter either an amount ($) or a percent (%), not both.");
    }

    const type = hasAmount ? "Amount" : "Percent";
    const value = Number(hasAmount ? form.amountValue : form.percentValue);
    if (!Number.isFinite(value) || value < 0) {
      return toast.error("Enter a valid non-negative value.");
    }

    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const payload = editId
        ? { _id: editId, name, value, type }
        : { name, value, type };

      const res = await fetch("/api/tax/servicetax", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Service tax ${editId ? "updated" : "saved"} successfully`);
        handleReset();
        fetchItems();
      } else {
        toast.error(json.message || "Failed to save");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/tax/servicetax?id=${deleteId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Service tax deleted");
        if (editId === deleteId) handleReset();
        fetchItems();
      } else {
        toast.error(json.message || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/tax/servicetax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: item._id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Status updated to ${newStatus}`);
        setItems((prev) =>
          prev.map((t) =>
            t._id === item._id ? { ...t, status: newStatus } : t,
          ),
        );
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div
      className="flex flex-col overflow-hidden min-h-screen"
      style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}
    >
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6 pb-16 font-sans">
          <div className="border-b border-zinc-200 pb-5">
            <h1
              className="text-[32px] font-bold leading-tight"
              style={{ color: PALETTE.ink }}
            >
              Service Tax
            </h1>
            <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
              Configure an optional server charge (amount or percent — one at a
              time).
            </p>
          </div>

          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                {editId ? "Edit Service Charge" : "Service Charge Form"}
              </h2>
              <p className="text-sm text-zinc-500">
                Enter either a dollar amount or a percent — not both.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700">
                  Service Charge Name
                </label>
                <Input
                  placeholder="e.g. Server Charge"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="border-zinc-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-zinc-700 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amountValue}
                      onChange={(e) => onAmountChange(e.target.value)}
                      className="border-zinc-200 pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-zinc-700 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" /> Percent (%)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={form.percentValue}
                      onChange={(e) => onPercentChange(e.target.value)}
                      className="border-zinc-200 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-500 text-sm">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {editId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="border-zinc-200"
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editId ? (
                    "Update"
                  ) : (
                    "Save Service Tax"
                  )}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Saved Service Taxes</h3>
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                No service tax configured yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">
                          {item.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            item.status === "Active"
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : "border-zinc-200 text-zinc-500"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-600 mt-0.5">
                        {item.type === "Percent"
                          ? `${Number(item.value).toFixed(2)}%`
                          : `$${Number(item.value).toFixed(2)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(item)}
                        className="border-zinc-200"
                      >
                        {item.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="border-zinc-200"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteId(item._id);
                          setIsDeleteOpen(true);
                        }}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <DeleteDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Service Tax?"
        description="This will remove the service charge configuration. POS will stop applying it."
      />
    </div>
  );
}
