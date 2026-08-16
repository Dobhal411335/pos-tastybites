"use client";

export default function FinancialInvoicesReport() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Financial & Accounting
        </p>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
          Invoices
        </h1>
      </div>

      <div className="border border-zinc-200 rounded-lg bg-white p-5 max-w-2xl space-y-3">
        <p className="text-sm font-medium text-zinc-900">
          Customer invoice generation is not currently supported.
        </p>
        <p className="text-sm text-zinc-600">
          The POS stores paid checks on the Order document and prints customer
          receipts as PrintJobs. There is no Invoice model, invoice number, or
          invoice status. Supplier stock-in invoice numbers are unrelated to
          guest checks.
        </p>
        <div className="text-sm text-zinc-600">
          <p className="font-medium text-zinc-800 mb-1">
            Minimum implementation required
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>An Invoice model linked to a paid Order</li>
            <li>Invoice number, issue date, guest, and payment status</li>
            <li>Totals copied from the existing Order (not recalculated)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
