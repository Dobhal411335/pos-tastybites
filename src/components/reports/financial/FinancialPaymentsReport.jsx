"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FinancialPageHeader from "./FinancialPageHeader";
import FinancialKpiCards from "./FinancialKpiCards";
import {
  DEFAULT_FINANCIAL_FILTERS,
  money,
  useFinancialReport,
} from "./useFinancialReport";

export default function FinancialPaymentsReport() {
  const [filters, setFilters] = useState(DEFAULT_FINANCIAL_FILTERS);
  const stableFilters = useMemo(() => filters, [filters]);
  const { data, loading } = useFinancialReport(
    "/api/admin/reports/financial/payments",
    stableFilters,
    { paginate: true }
  );

  const methods = data?.summary?.methods || [];
  const issued = data?.giftCards?.issued;
  const redeemed = data?.giftCards?.redeemed;

  return (
    <FinancialPageHeader
      title="Payments"
      description="Tenders from paid orders. Split checkouts appear as one row with cash, card, and gift-card amounts."
      filters={filters}
      onFiltersChange={setFilters}
      filterProps={{ showSearch: true, searchPlaceholder: "Order #" }}
      loading={loading}
      empty={!data || data.empty}
      emptyMessage="No payment data found for the selected period."
    >
      <div className="space-y-4">
        <FinancialKpiCards
          items={[
            { label: "Total Collected", value: data?.summary?.collected, money: true },
            ...methods.map((m) => ({
              label: m.method,
              value: `${money(m.amount)} · ${m.count} · ${m.percent}%`,
            })),
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-zinc-200 rounded-lg bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Gift cards redeemed
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {money(redeemed?.amount)} · {redeemed?.count || 0} orders
            </p>
            <p className="mt-1 text-xs text-zinc-500">{redeemed?.note}</p>
          </div>
          <div className="border border-zinc-200 rounded-lg bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Gift cards issued
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {money(issued?.amount)} · {issued?.count || 0} cards
            </p>
            <p className="mt-1 text-xs text-zinc-500">{issued?.note}</p>
          </div>
        </div>

        <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {["Date", "Time", "Order #", "Employee", "Payment Method", "Cash", "Card", "Gift Card", "Amount", "Status"].map(
                  (h) => (
                    <TableHead key={h} className="text-[11px] uppercase whitespace-nowrap">
                      {h}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.time}</TableCell>
                  <TableCell className="font-medium">{row.orderNumber}</TableCell>
                  <TableCell>{row.employee}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.paymentLabel}</TableCell>
                  <TableCell className="tabular-nums text-right">{money(row.cash)}</TableCell>
                  <TableCell className="tabular-nums text-right">{money(row.card)}</TableCell>
                  <TableCell className="tabular-nums text-right">{money(row.giftCard)}</TableCell>
                  <TableCell className="tabular-nums text-right font-medium">{money(row.amount)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
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
  );
}
