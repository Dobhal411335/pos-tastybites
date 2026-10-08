"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  Banknote,
  Wallet,
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
import OrderDetailBody, {
  OrderSourceBadge,
  PAYMENT_STATUS_BADGE,
} from "@/components/reports/OrderDetailBody";
import FinancialPageHeader from "./FinancialPageHeader";
import FinancialKpiCards from "./FinancialKpiCards";
import {
  DEFAULT_FINANCIAL_FILTERS,
  money,
  useFinancialReport,
} from "./useFinancialReport";

const METHOD_ICON = {
  Cash: Banknote,
  Card: CreditCard,
  "Gift Card": Gift,
};

export default function FinancialPaymentsReport() {
  const [filters, setFilters] = useState(DEFAULT_FINANCIAL_FILTERS);
  const stableFilters = useMemo(() => filters, [filters]);
  const { data, loading, error, reload } = useFinancialReport(
    "/api/admin/reports/financial/payments",
    stableFilters,
    { paginate: true }
  );

  const [orderId, setOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const methods = data?.summary?.methods || [];
  const issued = data?.giftCards?.issued;
  const redeemed = data?.giftCards?.redeemed;

  const openOrder = async (id) => {
    setOrderId(id);
    setOrderDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/financial/orders/${id}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Payment could not be loaded.");
      }
      setOrderDetail(json.data);
    } catch (err) {
      const message = err.message || "Payment could not be loaded.";
      setDetailError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <FinancialPageHeader
        title="Payments"
        description="Tenders from paid orders. Split checkouts show each payer with method, seats, and cash/card amounts."
        filters={filters}
        onFiltersChange={setFilters}
        filterProps={{
          showStatus: false,
          showSearch: true,
          searchPlaceholder: "Order # or invoice #",
        }}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={!error && (!data || data.empty)}
        emptyMessage="No payment data found for the selected period."
      >
        <div className="space-y-4">
          <FinancialKpiCards
            items={[
              {
                label: "Total Collected",
                value: data?.summary?.collected,
                money: true,
                icon: Wallet,
              },
              ...methods.map((m) => ({
                label: m.method,
                value: m.amount,
                money: true,
                icon: METHOD_ICON[m.method] || Wallet,
                hint: `${m.count} payments · ${m.percent}%`,
              })),
            ]}
          />

          <FinancialKpiCards
            columns={2}
            items={[
              {
                label: "Gift Cards Redeemed",
                value: redeemed?.amount,
                money: true,
                icon: Gift,
                hint: `${redeemed?.count || 0} orders · ${redeemed?.note || ""}`.trim(),
              },
              {
                label: "Gift Cards Issued",
                value: issued?.amount,
                money: true,
                icon: Gift,
                hint: `${issued?.count || 0} cards · ${issued?.note || ""}`.trim(),
              },
            ]}
          />

          <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Date",
                    "Time",
                    "Order #",
                    "Type",
                    "Employee",
                    "Payment Method",
                    "Cash",
                    "Card",
                    "Gift Card",
                    "Amount",
                    "Status",
                  ].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows || []).map((row) => (
                  <Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => openOrder(row.id)}
                    >
                      <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.time}</TableCell>
                      <TableCell className="font-medium">{row.orderNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <OrderSourceBadge order={row} />
                          {row.hasSplits ? (
                            <span className="text-[10px] text-violet-700 font-medium">
                              {row.splitCount} payer{row.splitCount === 1 ? "" : "s"}
                              {row.seatBasedPayments ? " · seats" : ""}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{row.employee}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.paymentLabel}</TableCell>
                      <TableCell className="tabular-nums text-right">{money(row.cash)}</TableCell>
                      <TableCell className="tabular-nums text-right">{money(row.card)}</TableCell>
                      <TableCell className="tabular-nums text-right">{money(row.giftCard)}</TableCell>
                      <TableCell className="tabular-nums text-right font-medium">{money(row.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            PAYMENT_STATUS_BADGE[row.paymentStatus || row.status] || ""
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {row.hasSplits
                      ? (row.splits || []).map((split) => (
                          <TableRow
                            key={`${row.id}-split-${split.index}`}
                            className="bg-violet-50/40 cursor-pointer"
                            onClick={() => openOrder(row.id)}
                          >
                            <TableCell colSpan={3} className="pl-8 text-xs text-zinc-600">
                              <span className="font-semibold text-zinc-800">{split.name}</span>
                              {split.seatLabel ? (
                                <span className="ml-2 text-violet-700">{split.seatLabel}</span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs text-zinc-500">—</TableCell>
                            <TableCell className="text-xs text-zinc-500">—</TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {split.methodLabel || split.method || "—"}
                              {split.tipAmount > 0 ? (
                                <div className="text-[10px] text-zinc-500">
                                  Tip {money(split.tipAmount)}
                                  {split.tipMethod ? ` · ${split.tipMethod}` : ""}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="tabular-nums text-right text-xs">
                              {money(split.cash)}
                            </TableCell>
                            <TableCell className="tabular-nums text-right text-xs">
                              {money(split.card)}
                            </TableCell>
                            <TableCell className="tabular-nums text-right text-xs">
                              {money(split.giftCard)}
                            </TableCell>
                            <TableCell className="tabular-nums text-right text-xs font-medium">
                              {money(split.amount)}
                            </TableCell>
                            <TableCell className="text-xs text-zinc-500">Split</TableCell>
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-500">
            <p>{data?.total || 0} payments</p>
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
            <SheetTitle>Payment details</SheetTitle>
            <SheetDescription>
              Order tenders with named splits, merged seats, and tip methods.
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
                {detailError || "Payment could not be loaded."}
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
