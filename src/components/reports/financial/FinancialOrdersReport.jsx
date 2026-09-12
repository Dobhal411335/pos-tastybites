"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCheck2,
  HandCoins,
  ListOrdered,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderDetailBody, { STATUS_BADGE } from "@/components/reports/OrderDetailBody";
import FinancialPageHeader from "./FinancialPageHeader";
import FinancialKpiCards from "./FinancialKpiCards";
import {
  DEFAULT_FINANCIAL_FILTERS,
  money,
  useFinancialReport,
} from "./useFinancialReport";

export default function FinancialOrdersReport() {
  const [filters, setFilters] = useState(DEFAULT_FINANCIAL_FILTERS);
  const stableFilters = useMemo(() => filters, [filters]);
  const { data, loading, error, reload } = useFinancialReport(
    "/api/admin/reports/financial/orders",
    stableFilters,
    { paginate: true }
  );

  const [orderId, setOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const openOrder = async (id) => {
    setOrderId(id);
    setOrderDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Order could not be loaded.");
      }
      setOrderDetail(json.data);
    } catch (err) {
      const message = err.message || "Order could not be loaded.";
      setDetailError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSort = (field) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortDir: prev.sortBy === field && prev.sortDir === "desc" ? "asc" : "desc",
      page: 1,
    }));
  };

  const counts = data?.statusCounts || {};

  return (
    <>
      <FinancialPageHeader
        title="Orders"
        description="Financially relevant orders for the selected period."
        filters={filters}
        onFiltersChange={setFilters}
        filterProps={{
          showStatus: true,
          showTable: true,
          showGuest: true,
          showSearch: true,
          searchPlaceholder: "Order #, invoice #, or guest",
        }}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={!error && (!data || data.empty)}
        emptyMessage="No orders found for the selected period."
      >
        <div className="space-y-4">
          <FinancialKpiCards
            items={[
              {
                label: "Total Orders",
                value: counts.total || 0,
                icon: ClipboardList,
              },
              {
                label: "Paid",
                value: counts.PAID || 0,
                icon: HandCoins,
                tone: "success",
              },
              {
                label: "Pending",
                value: counts.PENDING || 0,
                icon: Clock,
              },
              {
                label: "Confirmed",
                value: counts.CONFIRMED || 0,
                icon: ListOrdered,
              },
              {
                label: "Completed",
                value: counts.COMPLETED || 0,
                icon: CheckCircle2,
              },
              {
                label: "Cancelled",
                value: counts.CANCELLED || 0,
                icon: Ban,
                tone: "danger",
              },
              {
                label: "Waived",
                value: counts.WAIVED || 0,
                icon: FileCheck2,
              },
            ]}
          />

          <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    ["orderNumber", "Order #"],
                    ["invoiceNumber", "Invoice #"],
                    ["updatedAt", "Date"],
                    [null, "Time"],
                    [null, "Employee"],
                    [null, "Table"],
                    [null, "Guest"],
                    ["subTotal", "Subtotal"],
                    [null, "Discount"],
                    [null, "Tax"],
                    [null, "Tips"],
                    [null, "Service Charge"],
                    ["totalAmount", "Total"],
                    ["paymentMethod", "Payment"],
                    ["status", "Status"],
                  ].map(([field, label]) => (
                    <TableHead key={label} className="text-[11px] uppercase whitespace-nowrap">
                      {field ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort(field)}
                        >
                          {label}
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows || []).map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => openOrder(row.id)}
                  >
                    <TableCell className="font-medium">{row.orderNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.invoiceNumber || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.time}</TableCell>
                    <TableCell>{row.employee}</TableCell>
                    <TableCell>{row.table}</TableCell>
                    <TableCell>{row.guest}</TableCell>
                    <TableCell className="tabular-nums text-right">{money(row.subTotal)}</TableCell>
                    <TableCell className="tabular-nums text-right">{money(row.discount)}</TableCell>
                    <TableCell className="tabular-nums text-right">{money(row.tax)}</TableCell>
                    <TableCell className="tabular-nums text-right">{money(row.tips)}</TableCell>
                    <TableCell className="tabular-nums text-right">{money(row.serviceCharge)}</TableCell>
                    <TableCell className="tabular-nums text-right font-medium">{money(row.total)}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.paymentLabel}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_BADGE[row.status] || ""}`}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-500">
            <p>{data?.total || 0} orders</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={(data?.page || 1) <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                Page {data?.page || 1} of {data?.pageCount || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(data?.page || 1) >= (data?.pageCount || 1)}
                onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </FinancialPageHeader>

      <Sheet open={Boolean(orderId)} onOpenChange={(open) => !open && setOrderId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Order details</SheetTitle>
            <SheetDescription>
              Existing order record. Totals are stored POS values.
            </SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : orderDetail ? (
            <OrderDetailBody order={orderDetail} />
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-zinc-500">
                {detailError || "Order could not be loaded."}
              </p>
              {orderId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openOrder(orderId)}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
