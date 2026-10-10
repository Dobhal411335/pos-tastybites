"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Gift,
  Loader2,
  Package,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportPager } from "@/components/reports/inventory/reportUi";
import OrderDetailBody, {
  OrderSourceBadge,
  PAYMENT_STATUS_BADGE,
  STATUS_BADGE,
  formatDateTime,
} from "@/components/reports/OrderDetailBody";
import {
  buildDeletedCashOrderDetailView,
  CASH_ONLY_DELETE_ERROR,
  DELETE_MODE_CASH_TENDER,
} from "@/lib/orders/orderDeleteEligibility";
import AdminReportFilters from "./AdminReportFilters";
import {
  AdminEmptyState,
  AdminKpiCard,
  AdminReportSkeleton,
  AdminTableCard,
  TD_CLASS,
  TH_CLASS,
} from "./adminReportUi";
import { DEFAULT_ADMIN_FILTERS, money } from "./useAdminReport";
import { cn } from "@/lib/utils";

function PaymentBadge({ label }) {
  const tone =
    label === "Cash"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : label === "Card"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : label === "Gift Card"
          ? "border-violet-200 bg-violet-50 text-violet-800"
          : label === "Split"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : label === "Cash removed"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-zinc-200 bg-zinc-50 text-zinc-700";
  return (
    <Badge variant="outline" className={`text-[12px] font-medium ${tone}`}>
      {label || "—"}
    </Badge>
  );
}

function splitTypeLabel(split) {
  const cash = Number(split?.cashAmount) || 0;
  const card = Number(split?.cardAmount) || 0;
  const gift = Number(split?.giftCard) || 0;
  if (cash > 0 && (card > 0 || gift > 0)) return "Cash + Card";
  if (cash > 0) return "Cash";
  if (gift > 0) return "Gift Card";
  if (card > 0) return "Card";
  const method = String(split?.method || "").trim();
  if (/cash/i.test(method) && /card/i.test(method)) return "Cash + Card";
  if (/gift/i.test(method)) return "Gift Card";
  if (/cash/i.test(method)) return "Cash";
  if (/card/i.test(method)) return "Card";
  return method || "—";
}

export default function OrderManagementSection() {
  const [view, setView] = useState("active");
  const [filters, setFilters] = useState({
    ...DEFAULT_ADMIN_FILTERS,
    preset: "TODAY",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({
      view,
      preset: filters.preset || "TODAY",
      page: String(page),
      pageSize: "25",
    });
    if (filters.preset === "CUSTOM") {
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
    }
    if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
      params.set("paymentMethod", filters.paymentMethod);
    }
    if (filters.search && String(filters.search).trim()) {
      params.set("search", String(filters.search).trim());
    }
    return params;
  }, [view, filters, page]);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/reports/admin/order-management?${buildParams()}`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) {
          throw new Error(json.message || "Failed to load orders");
        }
        setData(json.data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load orders");
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [buildParams]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reports/admin/order-management?${buildParams()}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Failed to load orders");
      }
      setData(json.data);
    } catch (err) {
      setError(err.message || "Failed to load orders");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const openOrder = async (id, row = null) => {
    setOrderId(id);
    setOrderDetail(null);
    setDetailLoading(true);
    try {
      const qs = view === "deleted" ? "?includeDeleted=1" : "";
      const res = await fetch(`/api/orders/${id}${qs}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        const raw = json.data;
        const showCashSnapshot =
          view === "deleted" &&
          (row?.deletionKind === "cash_tender" ||
            Boolean(raw?.cashTenderRemovedAt && raw?.isActive !== false));
        setOrderDetail(
          showCashSnapshot
            ? buildDeletedCashOrderDetailView(raw, {
                entryId: row?.cashEntryId || null,
              })
            : raw
        );
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const openCashDeleteConfirm = (row) => {
    const splits = Array.isArray(row.removableCashSplits)
      ? row.removableCashSplits
      : [];
    const cashIndexes = splits
      .filter((s) => s.canRemoveCash)
      .map((s) => s.index);
    setConfirm({
      type: "soft-delete",
      row,
      selectedSplitIndices:
        row.deleteMode === DELETE_MODE_CASH_TENDER && splits.length > 0
          ? cashIndexes
          : null,
    });
  };

  const toggleCashSplitSelection = (index, checked) => {
    setConfirm((prev) => {
      if (!prev || prev.type !== "soft-delete") return prev;
      const current = new Set(prev.selectedSplitIndices || []);
      if (checked) current.add(index);
      else current.delete(index);
      return { ...prev, selectedSplitIndices: [...current] };
    });
  };

  const toggleCashEntrySelection = (entryId, checked) => {
    setConfirm((prev) => {
      if (
        !prev ||
        (prev.type !== "restore-cash" && prev.type !== "permanent-cash")
      ) {
        return prev;
      }
      const current = new Set(prev.selectedEntryIds || []);
      if (checked) current.add(entryId);
      else current.delete(entryId);
      return { ...prev, selectedEntryIds: [...current] };
    });
  };

  const openRestoreCashConfirm = (row) => {
    const entries = Array.isArray(row.removedCashEntries)
      ? row.removedCashEntries
      : [];
    const defaultIds =
      row.cashEntryId
        ? [row.cashEntryId]
        : entries.map((e) => e.entryId).filter(Boolean);
    setConfirm({
      type: "restore-cash",
      row,
      selectedEntryIds: defaultIds.length ? defaultIds : null,
    });
  };

  const openPermanentCashConfirm = (row) => {
    const entries = Array.isArray(row.removedCashEntries)
      ? row.removedCashEntries
      : [];
    const defaultIds =
      row.cashEntryId
        ? [row.cashEntryId]
        : entries.map((e) => e.entryId).filter(Boolean);
    setConfirm({
      type: "permanent-cash",
      row,
      selectedEntryIds: defaultIds.length ? defaultIds : null,
    });
  };

  const runAction = async () => {
    if (!confirm) return;
    const { type, row, selectedSplitIndices, selectedEntryIds } = confirm;
    if (
      type === "soft-delete" &&
      row.deleteMode === DELETE_MODE_CASH_TENDER &&
      Array.isArray(selectedSplitIndices) &&
      selectedSplitIndices.length === 0
    ) {
      setActionError("Select at least one cash payment to remove.");
      return;
    }
    if (
      (type === "restore-cash" || type === "permanent-cash") &&
      Array.isArray(selectedEntryIds) &&
      selectedEntryIds.length === 0
    ) {
      setActionError("Select at least one cash seat.");
      return;
    }
    const busyKey = row.rowKey || row.id;
    setBusyId(busyKey);
    setActionError(null);
    try {
      let res;
      if (type === "soft-delete") {
        const body = {};
        if (
          row.deleteMode === DELETE_MODE_CASH_TENDER &&
          Array.isArray(selectedSplitIndices) &&
          selectedSplitIndices.length > 0
        ) {
          body.splitIndices = selectedSplitIndices;
        }
        res = await fetch(`/api/admin/orders/${row.id}/soft-delete`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else if (type === "restore") {
        res = await fetch(`/api/admin/orders/${row.id}/restore`, {
          method: "POST",
          credentials: "include",
        });
      } else if (type === "restore-cash") {
        const body = {};
        if (Array.isArray(selectedEntryIds) && selectedEntryIds.length > 0) {
          body.entryIds = selectedEntryIds;
        } else if (row.cashEntryId) {
          body.entryIds = [row.cashEntryId];
        }
        res = await fetch(`/api/admin/orders/${row.id}/restore-cash`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else if (type === "permanent") {
        res = await fetch(`/api/admin/orders/${row.id}/permanent`, {
          method: "DELETE",
          credentials: "include",
        });
      } else if (type === "permanent-cash") {
        const body = {};
        if (Array.isArray(selectedEntryIds) && selectedEntryIds.length > 0) {
          body.entryIds = selectedEntryIds;
        } else if (row.cashEntryId) {
          body.entryIds = [row.cashEntryId];
        }
        res = await fetch(`/api/admin/orders/${row.id}/permanent-cash`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Action failed");
      }
      setConfirm(null);
      await reload();
    } catch (err) {
      setActionError(err.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleFiltersChange = (next) => {
    setPage(1);
    setFilters((prev) =>
      typeof next === "function" ? next(prev) : { ...prev, ...next }
    );
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ ...DEFAULT_ADMIN_FILTERS, preset: "TODAY" });
  };

  const toggleDeletedView = () => {
    setPage(1);
    setActionError(null);
    setView((prev) => (prev === "deleted" ? "active" : "deleted"));
  };

  const kpis = data?.kpis || {};
  const deletedCount = data?.deletedCount ?? 0;
  const isDeletedView = view === "deleted";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <AdminReportFilters
            value={filters}
            onChange={handleFiltersChange}
            section="order-management"
            loading={loading}
            onRefresh={reload}
            onClear={clearFilters}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleDeletedView}
          className={cn(
            "relative h-9 shrink-0 gap-2 self-start lg:mt-0",
            isDeletedView
              ? "border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          )}
          title={
            isDeletedView
              ? "Back to active orders"
              : "View soft-deleted orders"
          }
        >
          {isDeletedView ? (
            <ArrowLeft className="h-4 w-4" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span className="text-xs font-semibold">
            {isDeletedView ? "Active orders" : "Deleted"}
          </span>
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
              isDeletedView
                ? "bg-white/20 text-white"
                : deletedCount > 0
                  ? "bg-red-500 text-white"
                  : "bg-zinc-200 text-zinc-600"
            )}
          >
            {deletedCount}
          </span>
        </Button>
      </div>

      {isDeletedView ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
          Showing soft-deleted orders and split orders with cash removed for
          this period. Full deletes can be restored to active reports; cash
          removals restore cash only (card stays). Permanent delete cannot be
          undone.
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {loading && !data ? (
        <AdminReportSkeleton cards={isDeletedView ? 1 : 5} />
      ) : error ? (
        <AdminEmptyState
          icon={Package}
          title="Could not load orders"
          message={error}
        />
      ) : (
        <>
          {!isDeletedView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <AdminKpiCard
                label="Total Orders"
                value={kpis.orderCount ?? 0}
                icon={Package}
              />
              <AdminKpiCard
                label="Cash"
                value={money(kpis.cash)}
                icon={Banknote}
              />
              <AdminKpiCard
                label="Card"
                value={money(kpis.card)}
                icon={CreditCard}
              />
              <AdminKpiCard
                label="Gift Card"
                value={money(kpis.giftCard)}
                icon={Gift}
              />
              <AdminKpiCard
                label="Total Revenue"
                value={money(kpis.totalRevenue ?? kpis.collected)}
                icon={Wallet}
                tone="success"
              />
            </div>
          ) : null}

          {!data || data.empty ? (
            <AdminEmptyState
              icon={isDeletedView ? Trash2 : Package}
              title={isDeletedView ? "No deleted orders" : "No active orders"}
              message={
                isDeletedView
                  ? "No soft-deleted orders in this date range."
                  : "No active orders match the selected filters."
              }
            />
          ) : (
            <AdminTableCard
              footer={<ReportPager data={data} onPage={setPage} />}
            >
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow>
                    <TableHead className={TH_CLASS}>#Order</TableHead>
                    <TableHead className={TH_CLASS}>Invoice</TableHead>
                    <TableHead className={TH_CLASS}>Date</TableHead>
                    <TableHead className={TH_CLASS}>Table</TableHead>
                    <TableHead className={TH_CLASS}>Server</TableHead>
                    <TableHead className={TH_CLASS}>Type</TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      Total
                    </TableHead>
                    <TableHead className={TH_CLASS}>Payment</TableHead>
                    {isDeletedView ? (
                      <>
                        {/* <TableHead className={TH_CLASS}>Deleted by</TableHead> */}
                        <TableHead className={TH_CLASS}>Deleted at</TableHead>
                      </>
                    ) : (
                      <TableHead className={TH_CLASS}>Status</TableHead>
                    )}
                    <TableHead className={`${TH_CLASS} text-right`}>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.rows || []).map((row) => (
                    <TableRow
                      key={row.rowKey || row.id}
                      className={cn(
                        "h-14 hover:bg-orange-50/50",
                        isDeletedView && "bg-zinc-50/80 text-zinc-600"
                      )}
                    >
                      <TableCell
                        className={`${TD_CLASS} whitespace-nowrap font-medium cursor-pointer`}
                        onClick={() => openOrder(row.id, row)}
                      >
                        # {row.orderNumber || "—"}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} whitespace-nowrap cursor-pointer`}
                        onClick={() => openOrder(row.id, row)}
                      >
                        {row.invoiceNumber || "—"}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} whitespace-nowrap cursor-pointer`}
                        onClick={() => openOrder(row.id, row)}
                      >
                        <div className="leading-tight">
                          <div>{row.date}</div>
                          <div className="text-[12px] text-zinc-500">
                            {row.time}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} max-w-[140px] truncate cursor-pointer`}
                        onClick={() => openOrder(row.id, row)}
                        title={row.table}
                      >
                        {row.table}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} max-w-[120px] truncate cursor-pointer`}
                        onClick={() => openOrder(row.id, row)}
                      >
                        {row.server}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} cursor-pointer`}
                        onClick={() => openOrder(row.id, row)}
                      >
                        <OrderSourceBadge
                          source={row.source}
                          order={{
                            source: row.source,
                            sourceLabel: row.sourceLabel,
                            orderTypeLabel: row.orderTypeLabel,
                          }}
                        />
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} text-right tabular-nums font-medium cursor-pointer`}
                        onClick={() => openOrder(row.id, row)}
                      >
                        {money(row.total)}
                      </TableCell>
                      <TableCell className={TD_CLASS}>
                        <div className="flex flex-col items-start gap-1">
                          <PaymentBadge label={row.paymentLabel} />
                          {isDeletedView &&
                          row.deletionKind === "cash_tender" &&
                          row.seatSummary ? (
                            <span className="text-[10px] text-zinc-500">
                              {row.seatSummary}
                            </span>
                          ) : null}
                          {isDeletedView &&
                          row.deletionKind === "cash_tender" &&
                          row.liveOrderNumber &&
                          row.orderNumber &&
                          String(row.liveOrderNumber) !==
                            String(row.orderNumber) ? (
                            <span className="text-[10px] text-zinc-500">
                              Active as #{row.liveOrderNumber}
                            </span>
                          ) : null}
                          {/* {!isDeletedView &&
                          row.hasRemovedCash &&
                          row.tenders?.card > 0 ? (
                            <span className="text-[10px] text-zinc-500">
                              Card {money(row.tenders.card)}
                            </span>
                          ) : null} */}
                          {row.paymentStatus === "PARTIAL" ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium ${
                                PAYMENT_STATUS_BADGE.PARTIAL || ""
                              }`}
                            >
                              PARTIAL
                              {row.remainingDue > 0
                                ? ` · ${money(row.remainingDue)} due`
                                : ""}
                            </Badge>
                          ) : null}
                          {row.hasSplits && row.splitCount > 1 ? (
                            <span className="text-[10px] text-zinc-500">
                              {row.splitCount} payers
                            </span>
                          ) : row.hasSplits && row.splitCount === 1 ? (
                            <span className="text-[10px] text-zinc-500">
                              1 payer
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      {isDeletedView ? (
                        <>
                          {/* <TableCell className={TD_CLASS}>
                            {row.deletedByName || "—"}
                          </TableCell> */}
                          <TableCell
                            className={`${TD_CLASS} whitespace-nowrap text-[13px]`}
                          >
                            {row.deletedAt
                              ? format(
                                  new Date(row.deletedAt),
                                  "MMM d, h:mm a"
                                )
                              : "—"}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className={TD_CLASS}>
                          <Badge
                            variant="outline"
                            className={`text-[13px] font-normal ${
                              STATUS_BADGE[row.status] || ""
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className={`${TD_CLASS} text-center`}>
                        <div className="inline-flex flex-wrap justify-end items-center gap-1.5">
                          {!isDeletedView ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              disabled={!row.canDelete || busyId === (row.rowKey || row.id)}
                              className={cn(
                                "h-8 w-8",
                                row.canDelete
                                  ? "border-red-200 text-red-700 hover:bg-red-50"
                                  : "border-zinc-200 text-zinc-300"
                              )}
                                title={
                                row.canDelete
                                  ? row.deleteMode === DELETE_MODE_CASH_TENDER
                                    ? "Remove pure cash seat(s) only — card and cash+card cannot be deleted"
                                    : row.hasSplits
                                      ? "Delete cash-only split order"
                                      : "Delete cash-only order"
                                  : row.hasRemovedCash
                                    ? "No more pure cash seats to remove. Open Deleted Orders to restore cash. Card and cash+card cannot be deleted."
                                    : "Only cash-only orders, or pure cash seats on a split with card/gift, can be deleted"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!row.canDelete) {
                                  setActionError(
                                    row.hasRemovedCash
                                      ? "Cash was already removed from this order. Use Deleted Orders to restore cash. Card/gift payments cannot be deleted."
                                      : CASH_ONLY_DELETE_ERROR
                                  );
                                  return;
                                }
                                openCashDeleteConfirm(row);
                              }}
                            >
                              {busyId === (row.rowKey || row.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          ) : row.deletionKind === "cash_tender" ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === (row.rowKey || row.id)}
                                className="h-8 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                title="Restore removed cash seat(s)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRestoreCashConfirm(row);
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Restore cash
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={busyId === (row.rowKey || row.id)}
                                className="h-8 w-8 border-red-300 text-red-800 hover:bg-red-50"
                                title="Permanently delete cash seat history"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPermanentCashConfirm(row);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === (row.rowKey || row.id)}
                                className="h-8 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirm({ type: "restore", row });
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Restore
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={busyId === (row.rowKey || row.id)}
                                className="h-8 w-8 border-red-300 text-red-800 hover:bg-red-50"
                                title="Permanently delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirm({ type: "permanent", row });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminTableCard>
          )}
        </>
      )}

      <Sheet
        open={Boolean(orderId)}
        onOpenChange={(open) => {
          if (!open) {
            setOrderId(null);
            setOrderDetail(null);
          }
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              Order #
              {orderDetail
                ? orderDetail.originalOrderNumber &&
                  /^(DEL-|RST-)/i.test(String(orderDetail.orderNumber || ""))
                  ? orderDetail.originalOrderNumber
                  : orderDetail.orderNumber
                : detailLoading
                  ? "…"
                  : ""}
            </SheetTitle>
            <SheetDescription>
              {orderDetail?._viewingRemovedCashSnapshot
                ? "Removed cash seat(s) only. Card/gift seats stay on the active order."
                : isDeletedView
                  ? "Soft-deleted order. Invoice number is preserved."
                  : "Active order record. Totals are stored POS values."}
            </SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : orderDetail ? (
            <div className="space-y-4 mt-2">
              {orderDetail._viewingRemovedCashSnapshot ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                    Cash payment removed
                  </p>
                  <div className="mt-1.5 space-y-0.5 text-zinc-700">
                    {orderDetail.cashTenderRemovedAt ? (
                      <div>
                        Removed at:{" "}
                        {formatDateTime(orderDetail.cashTenderRemovedAt)}
                      </div>
                    ) : null}
                    {orderDetail.cashTenderRemovalReason ? (
                      <div>Reason: {orderDetail.cashTenderRemovalReason}</div>
                    ) : null}
                    <div>
                      Showing only the cash seat(s) / cash tender that were
                      removed from the split payment.
                    </div>
                  </div>
                </div>
              ) : null}
              {orderDetail.isActive === false ? (
                <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-3 text-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                    Soft-deleted
                  </p>
                  <div className="mt-1.5 space-y-0.5 text-zinc-700">
                    {orderDetail.deletedAt ? (
                      <div>Deleted at: {formatDateTime(orderDetail.deletedAt)}</div>
                    ) : null}
                    {orderDetail.deletionReason ? (
                      <div>Reason: {orderDetail.deletionReason}</div>
                    ) : null}
                    {orderDetail.restoredAt ? (
                      <div>
                        Previously restored: {formatDateTime(orderDetail.restoredAt)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <OrderDetailBody order={orderDetail} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Order could not be loaded.
            </p>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "soft-delete"
                ? confirm?.row?.deleteMode === DELETE_MODE_CASH_TENDER
                  ? "Remove Cash Payment?"
                  : "Delete Order?"
                : confirm?.type === "restore"
                  ? "Restore Order?"
                  : confirm?.type === "restore-cash"
                    ? "Restore Cash Payment?"
                    : confirm?.type === "permanent-cash"
                      ? "Permanently Delete Cash?"
                      : "Permanent Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-3">
                {confirm?.type === "soft-delete" &&
                confirm?.row?.deleteMode === DELETE_MODE_CASH_TENDER ? (
                  <>
                    <p>
                      Remove pure cash seat(s) from Order #
                      {confirm?.row?.orderNumber}. Card and cash+card seats
                      cannot be deleted. The order stays active; you can restore
                      cash later until permanently deleted.
                    </p>
                    {Array.isArray(confirm?.row?.removableCashSplits) &&
                    confirm.row.removableCashSplits.length > 0 ? (
                      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-zinc-800">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                          Select pure cash seats to remove
                        </p>
                        {confirm.row.removableCashSplits.map((split) => {
                          const selected =
                            Array.isArray(confirm.selectedSplitIndices) &&
                            confirm.selectedSplitIndices.includes(split.index);
                          const seats =
                            Array.isArray(split.seatNumbers) &&
                            split.seatNumbers.length
                              ? `Seat ${split.seatNumbers.join(", ")}`
                              : null;
                          const blockedReason = split.canRemoveCash
                            ? null
                            : split.cashAmount > 0 &&
                                (split.cardAmount > 0 || split.giftCard > 0)
                              ? "Cannot delete (cash + card)"
                              : split.giftCard > 0
                                ? "Cannot delete (gift card)"
                                : "Cannot delete (card)";
                          return (
                            <label
                              key={split.index}
                              className={cn(
                                "flex items-start gap-3 rounded-md border px-3 py-2",
                                split.canRemoveCash
                                  ? "border-zinc-200 bg-white cursor-pointer"
                                  : "border-zinc-100 bg-zinc-100/80 opacity-70 pointer-events-none"
                              )}
                            >
                              {split.canRemoveCash ? (
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-red-600"
                                  checked={Boolean(selected)}
                                  onChange={(e) =>
                                    toggleCashSplitSelection(
                                      split.index,
                                      e.target.checked
                                    )
                                  }
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  checked={false}
                                  disabled
                                  readOnly
                                  aria-disabled="true"
                                />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-zinc-900">
                                    {split.name || `Payer ${split.index + 1}`}
                                  </span>
                                  <PaymentBadge label={splitTypeLabel(split)} />
                                </span>
                                <span className="mt-0.5 block text-[12px] text-zinc-500">
                                  {[
                                    seats,
                                    money(
                                      split.amount ||
                                        split.cashAmount ||
                                        split.cardAmount ||
                                        0
                                    ),
                                    blockedReason,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : confirm?.type === "soft-delete" ? (
                  <p>
                    Are you sure you want to delete Order #
                    {confirm?.row?.orderNumber}? This order will be removed from
                    active reports and moved to Deleted Orders.
                  </p>
                ) : confirm?.type === "restore" ? (
                  <p>
                    Restoring this order will return it to the active order list
                    and update the order-number sequence for that business day.
                  </p>
                ) : confirm?.type === "restore-cash" ? (
                  <>
                    <p>
                      Restore cash seat(s) on Order #
                      {confirm?.row?.orderNumber}? Card/gift amounts are
                      unchanged.
                    </p>
                    {Array.isArray(confirm?.row?.removedCashEntries) &&
                    confirm.row.removedCashEntries.length > 0 ? (
                      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-zinc-800">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                          Select cash seats to restore
                        </p>
                        {confirm.row.removedCashEntries.map((entry) => {
                          const selected =
                            Array.isArray(confirm.selectedEntryIds) &&
                            confirm.selectedEntryIds.includes(entry.entryId);
                          const seats =
                            Array.isArray(entry.seatNumbers) &&
                            entry.seatNumbers.length
                              ? `Seat ${entry.seatNumbers.join(", ")}`
                              : entry.name || "Cash";
                          return (
                            <label
                              key={entry.entryId}
                              className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 accent-emerald-600"
                                checked={Boolean(selected)}
                                onChange={(e) =>
                                  toggleCashEntrySelection(
                                    entry.entryId,
                                    e.target.checked
                                  )
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span className="font-medium text-zinc-900">
                                  {seats}
                                </span>
                                <span className="mt-0.5 block text-[12px] text-zinc-500">
                                  Cash{" "}
                                  {money(
                                    entry.totalAmount ?? entry.removedCash ?? 0
                                  )}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : confirm?.type === "permanent-cash" ? (
                  <>
                    <p>
                      Permanently delete cash seat history for Order #
                      {confirm?.row?.orderNumber}? This cannot be undone. The
                      order stays active with remaining payments.
                    </p>
                    {Array.isArray(confirm?.row?.removedCashEntries) &&
                    confirm.row.removedCashEntries.length > 0 ? (
                      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-zinc-800">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                          Select cash seats to permanently delete
                        </p>
                        {confirm.row.removedCashEntries.map((entry) => {
                          const selected =
                            Array.isArray(confirm.selectedEntryIds) &&
                            confirm.selectedEntryIds.includes(entry.entryId);
                          const seats =
                            Array.isArray(entry.seatNumbers) &&
                            entry.seatNumbers.length
                              ? `Seat ${entry.seatNumbers.join(", ")}`
                              : entry.name || "Cash";
                          return (
                            <label
                              key={entry.entryId}
                              className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 accent-red-600"
                                checked={Boolean(selected)}
                                onChange={(e) =>
                                  toggleCashEntrySelection(
                                    entry.entryId,
                                    e.target.checked
                                  )
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span className="font-medium text-zinc-900">
                                  {seats}
                                </span>
                                <span className="mt-0.5 block text-[12px] text-zinc-500">
                                  Cash{" "}
                                  {money(
                                    entry.totalAmount ?? entry.removedCash ?? 0
                                  )}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p>
                    Are you sure you want to permanently delete this order? This
                    action cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                Boolean(busyId) ||
                (confirm?.type === "soft-delete" &&
                  confirm?.row?.deleteMode === DELETE_MODE_CASH_TENDER &&
                  Array.isArray(confirm?.selectedSplitIndices) &&
                  confirm.selectedSplitIndices.length === 0) ||
                ((confirm?.type === "restore-cash" ||
                  confirm?.type === "permanent-cash") &&
                  Array.isArray(confirm?.selectedEntryIds) &&
                  confirm.selectedEntryIds.length === 0)
              }
              className={
                confirm?.type === "restore" || confirm?.type === "restore-cash"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }
              onClick={(e) => {
                e.preventDefault();
                runAction();
              }}
            >
              {busyId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirm?.type === "soft-delete" ? (
                confirm?.row?.deleteMode === DELETE_MODE_CASH_TENDER
                  ? Array.isArray(confirm?.selectedSplitIndices) &&
                    confirm.selectedSplitIndices.length === 1
                    ? "Remove Selected Cash"
                    : "Remove Cash"
                  : "Delete Order"
              ) : confirm?.type === "restore" ? (
                "Restore Order"
              ) : confirm?.type === "restore-cash" ? (
                "Restore Cash"
              ) : confirm?.type === "permanent-cash" ? (
                "Permanently Delete Cash"
              ) : (
                "Permanently Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
