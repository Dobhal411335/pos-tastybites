"use client";

import React from "react";

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function SimpleTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded border border-stone-200">
      <table className="w-full text-sm">
        <thead className="bg-stone-50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-medium text-stone-600 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-3 text-stone-400"
              >
                —
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className={
                  String(row[0]).toUpperCase() === "TOTAL"
                    ? "bg-stone-50 font-semibold"
                    : "border-t border-stone-100"
                }
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MetricGrid({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded border border-stone-200 bg-white px-3 py-2"
        >
          <div className="text-[11px] text-stone-500">{it.label}</div>
          <div className="text-sm font-semibold text-stone-900 tabular-nums">
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EodReportPreview({ report }) {
  if (!report) return null;

  const dss = report.detailedSalesSummary || {};
  const dls = report.detailedLaborSummary || {};
  const ps = report.paymentsSummary || {};
  const ts = report.tipsSummary || {};
  const st = report.salesTaxAndTipSummary || {};
  const cd = report.cashDeposit || {};

  return (
    <div className="space-y-6">
      <Section title="Detailed Sales Summary">
        <MetricGrid
          items={[
            { label: "Net Sales", value: money(dss.netSales) },
            { label: "Gross Sales", value: money(dss.grossSales) },
            { label: "Total Discounts", value: money(dss.totalDiscounts) },
            { label: "Menu Item Cost", value: money(dss.menuItemCost) },
            { label: "Labor Cost", value: money(dss.laborCost) },
            { label: "Gross Margin", value: money(dss.grossMargin) },
            { label: "Total Sales Taxes", value: money(dss.totalSalesTaxes) },
            { label: "Avg Per Guest", value: money(dss.averagePerGuest) },
            { label: "Avg Per Bill", value: money(dss.averagePerBill) },
            { label: "Total Refund Amount", value: money(dss.totalRefundAmount) },
          ]}
        />
      </Section>

      <Section title="Detailed Labor Summary">
        <MetricGrid
          items={[
            { label: "Total Labor Cost", value: money(dls.totalLaborCost) },
            { label: "Total Labor Hours", value: money(dls.totalLaborHours) },
            {
              label: "Labor Cost % Net",
              value: `${Number(dls.laborCostPctOfNetSales || 0).toFixed(2)}%`,
            },
            {
              label: "Avg Table Turn (min)",
              value: money(dls.averageTableTurnTimeMinutes),
            },
            { label: "Non-Cash Tips", value: money(dls.totalNonCashTips) },
            { label: "Cash Tips", value: money(dls.totalCashTips) },
            { label: "Total Tips", value: money(dls.totalTips) },
            { label: "Total Gratuity", value: money(dls.totalGratuity) },
            { label: "Active Shifts", value: dls.totalActiveShifts ?? 0 },
            { label: "Completed Shifts", value: dls.totalCompletedShifts ?? 0 },
          ]}
        />
      </Section>

      <Section title="Payments Summary">
        <MetricGrid
          items={[
            { label: "Transactions", value: ps.transactionsCount ?? 0 },
            { label: "Refunds Count", value: ps.refundsCount ?? 0 },
            { label: "Total Cash", value: money(ps.totalCash) },
            { label: "Total Non-Cash", value: money(ps.totalNonCash) },
            { label: "Total Surcharges", value: money(ps.totalSurcharges) },
            { label: "Total Payment", value: money(ps.totalPayment) },
            {
              label: "Payments − Net Sales",
              value: money(ps.totalPaymentsMinusNetSales),
            },
            { label: "Cash Rounding", value: money(ps.totalCashRounding) },
          ]}
        />
      </Section>

      <Section title="Sales By Section">
        <SimpleTable
          headers={[
            "Section Name",
            "Bill Count",
            "Net Sales",
            "Gross Sales",
            "Discounts",
            "Taxes",
          ]}
          rows={[
            ...(report.salesBySection?.rows || []).map((r) => [
              r.sectionName,
              r.billCount,
              money(r.netSales),
              money(r.grossSales),
              money(r.discounts),
              money(r.taxes),
            ]),
            report.salesBySection?.total
              ? [
                  "TOTAL",
                  report.salesBySection.total.billCount,
                  money(report.salesBySection.total.netSales),
                  money(report.salesBySection.total.grossSales),
                  money(report.salesBySection.total.discounts),
                  money(report.salesBySection.total.taxes),
                ]
              : null,
          ].filter(Boolean)}
        />
      </Section>

      <Section title="Sales By Sales Category">
        <SimpleTable
          headers={[
            "Sales Category",
            "Qty",
            "Net Sales",
            "Gross Sales",
            "Discounts",
            "Taxes",
          ]}
          rows={[
            ...(report.salesBySalesCategory?.rows || []).map((r) => [
              r.salesCategory,
              r.menuItemQuantity,
              money(r.netSales),
              money(r.grossSales),
              money(r.discounts),
              money(r.taxes),
            ]),
            report.salesBySalesCategory?.total
              ? [
                  "TOTAL",
                  report.salesBySalesCategory.total.menuItemQuantity,
                  money(report.salesBySalesCategory.total.netSales),
                  money(report.salesBySalesCategory.total.grossSales),
                  money(report.salesBySalesCategory.total.discounts),
                  money(report.salesBySalesCategory.total.taxes),
                ]
              : null,
          ].filter(Boolean)}
        />
      </Section>

      <Section title="Gift Card Sales">
        <SimpleTable
          headers={["Item", "Count", "Total"]}
          rows={(report.giftCardSales?.rows || []).map((r) => [
            r.item,
            r.count,
            money(r.total),
          ])}
        />
      </Section>

      <Section title="Tips By Employees">
        <SimpleTable
          headers={["Employee Name", "Cash Tips", "Non-Cash Tips", "Total Tips"]}
          rows={[
            ...(report.tipsByEmployees?.rows || []).map((r) => [
              r.employeeName,
              money(r.cashTips),
              money(r.nonCashTips),
              money(r.totalTips),
            ]),
            report.tipsByEmployees?.total
              ? [
                  "TOTAL",
                  money(report.tipsByEmployees.total.cashTips),
                  money(report.tipsByEmployees.total.nonCashTips),
                  money(report.tipsByEmployees.total.totalTips),
                ]
              : null,
          ].filter(Boolean)}
        />
      </Section>

      <Section title="Tips Summary">
        <MetricGrid
          items={[
            { label: "Cash Tips", value: money(ts.totalCashTips) },
            { label: "Non-Cash Tips", value: money(ts.totalNonCashTips) },
            { label: "Total Tips", value: money(ts.totalTips) },
          ]}
        />
      </Section>

      <Section title="Payment By Payment Type">
        <SimpleTable
          headers={[
            "Payment Type",
            "Count",
            "Refunds",
            "Tips",
            "Payment Total",
          ]}
          rows={[
            ...(report.paymentByPaymentType?.rows || []).map((r) => [
              r.paymentType,
              r.paymentCount,
              money(r.refunds),
              money(r.tips),
              money(r.paymentTotal),
            ]),
            report.paymentByPaymentType?.total
              ? [
                  "TOTAL",
                  report.paymentByPaymentType.total.paymentCount,
                  money(report.paymentByPaymentType.total.refunds),
                  money(report.paymentByPaymentType.total.tips),
                  money(report.paymentByPaymentType.total.paymentTotal),
                ]
              : null,
          ].filter(Boolean)}
        />
      </Section>

      <Section title="Accounts">
        <SimpleTable
          headers={["Account Name", "Payments", "Deposits"]}
          rows={(report.accounts?.rows || []).map((r) => [
            r.accountName,
            money(r.payments),
            money(r.deposits),
          ])}
        />
      </Section>

      <Section title="Tip Outs">
        <MetricGrid
          items={[
            {
              label: "Cash Owed To House",
              value: money(report.tipOuts?.totalCashOwedToHouse),
            },
            {
              label: "Cash Owed To Server",
              value: money(report.tipOuts?.totalCashOwedToServer),
            },
          ]}
        />
      </Section>

      <Section title="Payouts / Payins">
        <MetricGrid
          items={[
            { label: "Total Payouts", value: money(report.payouts?.totalPayouts) },
            { label: "Total Payins", value: money(report.payins?.totalPayins) },
          ]}
        />
      </Section>

      <Section title="Sales Tax And Tip Summary">
        <MetricGrid
          items={[
            { label: "Net Sales", value: money(st.netSales) },
            { label: "Gross Sales", value: money(st.grossSales) },
            { label: "Discounts", value: money(st.totalDiscounts) },
            { label: "Taxes", value: money(st.totalSalesTaxes) },
            { label: "Tips", value: money(st.totalTips) },
            {
              label: "Net + Tax + Tips",
              value: money(st.totalNetSalesTaxesAndTips),
            },
            { label: "Refunds", value: money(st.totalRefundsAmount) },
            { label: "Voids", value: money(st.totalVoids) },
            { label: "Bill Count", value: st.totalBillCount ?? 0 },
            { label: "Guest Count", value: st.totalGuestCount ?? 0 },
            { label: "Gift Card Sales", value: money(st.giftCardSales) },
            { label: "Gross Margin", value: money(st.grossMargin) },
          ]}
        />
      </Section>

      <Section title="Cash Deposit">
        <MetricGrid
          items={[
            { label: "Business Day", value: cd.businessDay || "—" },
            { label: "Expected Deposit", value: money(cd.expectedDeposit) },
            { label: "Actual Deposit", value: money(cd.actualDeposit) },
            { label: "Over / Short", value: money(cd.overShort) },
            { label: "Created By", value: cd.createdBy || "—" },
          ]}
        />
      </Section>

      <Section title="Tax Summary">
        <SimpleTable
          headers={["Tax Name", "Bill Count", "Tax Amount", "Net Sales"]}
          rows={[
            ...(report.taxSummary?.rows || []).map((r) => [
              r.taxName,
              r.billCount,
              money(r.taxAmount),
              money(r.netSales),
            ]),
            report.taxSummary?.total
              ? [
                  "TOTAL",
                  report.taxSummary.total.billCount ?? "",
                  money(report.taxSummary.total.taxAmount),
                  report.taxSummary.total.netSales ?? "",
                ]
              : null,
          ].filter(Boolean)}
        />
      </Section>
    </div>
  );
}
