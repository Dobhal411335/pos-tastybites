"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialKpiCards from "@/components/reports/financial/FinancialKpiCards";
import InventoryFilters from "./InventoryFilters";
import OverviewTab from "./OverviewTab";
import StockTab from "./StockTab";
import MovementTab from "./MovementTab";
import TopItemsTab from "./TopItemsTab";
import LowStockTab from "./LowStockTab";
import {
  DEFAULT_INVENTORY_FILTERS,
  inventoryQueryString,
  money,
  qty,
  useInventoryReport,
} from "./useInventoryReport";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "stock", label: "Stock" },
  { id: "movements", label: "Stock Movement" },
  { id: "top", label: "Top Items" },
  { id: "low", label: "Low / Out of Stock" },
];

export default function InventoryStockReport() {
  const [filters, setFilters] = useState(DEFAULT_INVENTORY_FILTERS);
  const [tab, setTab] = useState("overview");
  const [downloading, setDownloading] = useState(null);
  const stableFilters = useMemo(() => filters, [filters]);

  const overview = useInventoryReport(
    "/api/admin/reports/inventory/overview",
    stableFilters
  );
  const stock = useInventoryReport(
    "/api/admin/reports/inventory/stock",
    stableFilters,
    { paginate: true, enabled: tab === "stock" }
  );
  const movements = useInventoryReport(
    "/api/admin/reports/inventory/movements",
    stableFilters,
    { paginate: true, enabled: tab === "movements" }
  );
  const topItems = useInventoryReport(
    "/api/admin/reports/inventory/top-items",
    stableFilters,
    { enabled: tab === "top" }
  );
  const lowStock = useInventoryReport(
    "/api/admin/reports/inventory/low-stock",
    stableFilters,
    { paginate: true, enabled: tab === "low" }
  );

  const kpis = overview.data?.kpis;
  const lookups = overview.data?.lookups || { categories: [], products: [] };

  const setPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleDownload = async (kind) => {
    setDownloading(kind);
    try {
      const qs = inventoryQueryString(filters);
      const res = await fetch(`/api/admin/reports/inventory/${kind}?${qs}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to download ${kind}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventory-Stock-${
        overview.data?.meta?.dateFrom || "report"
      }-to-${overview.data?.meta?.dateTo || "report"}.${
        kind === "excel" ? "xlsx" : "pdf"
      }`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${kind === "excel" ? "Excel" : "PDF"} downloaded`);
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Inventory & Stock
          </p>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
            Inventory & Stock Reports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Live balances from Stock In and Stock Out. POS orders do not deduct inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!!downloading || overview.loading}
            onClick={() => handleDownload("excel")}
          >
            {downloading === "excel" ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            )}
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!!downloading || overview.loading}
            onClick={() => handleDownload("pdf")}
          >
            {downloading === "pdf" ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      <InventoryFilters
        value={filters}
        onChange={setFilters}
        categories={lookups.categories}
        products={lookups.products}
      />

      {overview.loading && !overview.data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <FinancialKpiCards
            items={[
              { label: "Total Products", value: kpis?.totalProducts || 0 },
              { label: "Total Stock Units", value: qty(kpis?.totalUnits) },
              { label: "Low Stock Items", value: kpis?.lowStockCount || 0 },
              { label: "Out of Stock", value: kpis?.outOfStockCount || 0 },
              { label: "Stock Added", value: qty(kpis?.stockAdded) },
              { label: "Stock Removed", value: qty(kpis?.stockRemoved) },
              {
                label: "Top Outgoing Product",
                value: kpis?.topOutgoingProduct?.name || "—",
              },
              {
                label: "Inventory Value",
                value: money(kpis?.inventoryValue),
              },
            ]}
          />

          <Tabs
            value={tab}
            onValueChange={(next) => {
              setTab(next);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="space-y-3"
          >
            <div className="sticky top-0 z-10 bg-[#FAF9F6] py-1">
              <TabsList className="w-full justify-start overflow-x-auto bg-white border border-zinc-200 h-auto p-1">
                {TABS.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="text-xs sm:text-sm"
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview">
              <OverviewTab data={overview.data} />
            </TabsContent>
            <TabsContent value="stock">
              <StockTab
                data={stock.data}
                loading={stock.loading}
                onPage={setPage}
              />
            </TabsContent>
            <TabsContent value="movements">
              <MovementTab
                data={movements.data}
                loading={movements.loading}
                onPage={setPage}
              />
            </TabsContent>
            <TabsContent value="top">
              <TopItemsTab
                data={topItems.data}
                loading={topItems.loading}
                sortBy={filters.sortBy}
                onSortBy={(sortBy) =>
                  setFilters((prev) => ({ ...prev, sortBy, page: 1 }))
                }
              />
            </TabsContent>
            <TabsContent value="low">
              <LowStockTab
                data={lowStock.data}
                loading={lowStock.loading}
                onPage={setPage}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
