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
  STATUS_BADGE,
} from "@/components/reports/OrderDetailBody";
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
            : "border-zinc-200 bg-zinc-50 text-zinc-700";
  return (
    <Badge variant="outline" className={`text-[12px] font-medium ${tone}`}>
      {label || "—"}
    </Badge>
  );
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

  const openOrder = async (id) => {
    setOrderId(id);
    setOrderDetail(null);
    setDetailLoading(true);
    try {
      const qs = view === "deleted" ? "?includeDeleted=1" : "";
      const res = await fetch(`/api/orders/${id}${qs}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) setOrderDetail(json.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async () => {
    if (!confirm) return;
    const { type, row } = confirm;
    setBusyId(row.id);
    setActionError(null);
    try {
      let res;
      if (type === "soft-delete") {
        res = await fetch(`/api/admin/orders/${row.id}/soft-delete`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } else if (type === "restore") {
        res = await fetch(`/api/admin/orders/${row.id}/restore`, {
          method: "POST",
          credentials: "include",
        });
      } else if (type === "permanent") {
        res = await fetch(`/api/admin/orders/${row.id}/permanent`, {
          method: "DELETE",
          credentials: "include",
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
          Showing soft-deleted orders for this period. Restore returns them to
          active reports; permanent delete cannot be undone.
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
                    <TableHead className={TH_CLASS}>Order #</TableHead>
                    <TableHead className={TH_CLASS}>Invoice</TableHead>
                    <TableHead className={TH_CLASS}>Date</TableHead>
                    <TableHead className={TH_CLASS}>Table</TableHead>
                    <TableHead className={TH_CLASS}>Server</TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      Total
                    </TableHead>
                    <TableHead className={TH_CLASS}>Payment</TableHead>
                    {isDeletedView ? (
                      <>
                        <TableHead className={TH_CLASS}>Deleted by</TableHead>
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
                      key={row.id}
                      className={cn(
                        "h-14 hover:bg-orange-50/50",
                        isDeletedView && "bg-zinc-50/80 text-zinc-600"
                      )}
                    >
                      <TableCell
                        className={`${TD_CLASS} whitespace-nowrap font-medium cursor-pointer`}
                        onClick={() => openOrder(row.id)}
                      >
                        {row.orderNumber || "—"}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} whitespace-nowrap cursor-pointer`}
                        onClick={() => openOrder(row.id)}
                      >
                        {row.invoiceNumber || "—"}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} whitespace-nowrap cursor-pointer`}
                        onClick={() => openOrder(row.id)}
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
                        onClick={() => openOrder(row.id)}
                        title={row.table}
                      >
                        {row.table}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} max-w-[120px] truncate cursor-pointer`}
                        onClick={() => openOrder(row.id)}
                      >
                        {row.server}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} text-right tabular-nums font-medium cursor-pointer`}
                        onClick={() => openOrder(row.id)}
                      >
                        {money(row.total)}
                      </TableCell>
                      <TableCell className={TD_CLASS}>
                        <PaymentBadge label={row.paymentLabel} />
                      </TableCell>
                      {isDeletedView ? (
                        <>
                          <TableCell className={TD_CLASS}>
                            {row.deletedByName || "—"}
                          </TableCell>
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
                      <TableCell className={`${TD_CLASS} text-right`}>
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {!isDeletedView ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              disabled={!row.canDelete || busyId === row.id}
                              className={cn(
                                "h-8 w-8",
                                row.canDelete
                                  ? "border-red-200 text-red-700 hover:bg-red-50"
                                  : "border-zinc-200 text-zinc-300"
                              )}
                              title={
                                row.canDelete
                                  ? "Delete cash-only order"
                                  : "Only cash-only orders can be deleted"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!row.canDelete) {
                                  setActionError(
                                    "Orders paid by Card, Gift Card, or split tenders that include Card/Gift Card cannot be deleted. Only cash-only orders can be deleted."
                                  );
                                  return;
                                }
                                setConfirm({ type: "soft-delete", row });
                              }}
                            >
                              {busyId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
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
                                disabled={busyId === row.id}
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
              {isDeletedView
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
              {orderDetail.paymentMethod || orderDetail.cashAmount != null ? (
                <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-3 text-sm">
                  <div className="font-medium text-zinc-800 mb-1">
                    Payment breakdown
                  </div>
                  <div className="text-zinc-600 space-y-0.5">
                    <div>Method: {orderDetail.paymentMethod || "—"}</div>
                    {orderDetail.cashAmount != null ? (
                      <div>Cash: {money(orderDetail.cashAmount)}</div>
                    ) : null}
                    {orderDetail.cardAmount != null ? (
                      <div>Card: {money(orderDetail.cardAmount)}</div>
                    ) : null}
                    {orderDetail.giftcardUsedAmount ? (
                      <div>
                        Gift Card: {money(orderDetail.giftcardUsedAmount)}
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
                ? "Delete Order?"
                : confirm?.type === "restore"
                  ? "Restore Order?"
                  : "Permanent Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "soft-delete" ? (
                <>
                  Are you sure you want to delete Order #
                  {confirm?.row?.orderNumber}? This order will be removed from
                  active reports and moved to Deleted Orders.
                </>
              ) : confirm?.type === "restore" ? (
                <>
                  Restoring this order will return it to the active order list
                  and update the order-number sequence for that business day.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete this order? This
                  action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(busyId)}
              className={
                
                confirm?.type === "restore"
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
                "Delete Order"
              ) : confirm?.type === "restore" ? (
                "Restore Order"
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
