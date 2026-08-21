"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Package,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryFilters from "./InventoryFilters";
import InventoryExportDialog from "./InventoryExportDialog";
import InventoryProductSheet from "./InventoryProductSheet";
import MovementTab from "./MovementTab";
import StockTab from "./StockTab";
import {
  DEFAULT_INVENTORY_FILTERS,
  inventoryQueryString,
  qty,
  useInventoryReport,
} from "./useInventoryReport";

const TABS = [
  { id: "overview", label: "Stock Overview" },
  { id: "in", label: "Stock In" },
  { id: "out", label: "Stock Out" },
  { id: "logs", label: "Movement Logs" },
];

const TAB_TRIGGER =
  "rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 pt-0 shadow-none text-zinc-500 hover:text-zinc-900 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:shadow-none";

function movementTypeForTab(tab) {
  if (tab === "in") return "STOCK_IN";
  if (tab === "out") return "STOCK_OUT";
  return "ALL";
}

function InventoryReportSkeleton() {
  return (
    <div className="flex flex-col w-full gap-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-zinc-200 bg-white shadow-sm rounded-xl p-4 h-28 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-6 border-b border-zinc-200 pb-2">
          {TABS.map((item) => (
            <Skeleton key={item.id} className="h-4 w-24" />
          ))}
        </div>

        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="bg-zinc-100 px-4 py-3 flex gap-4 border-b border-zinc-200">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1 max-w-[100px]" />
            ))}
          </div>
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 8 }).map((_, row) => (
              <div key={row} className="px-4 py-4 flex gap-4 items-center">
                {Array.from({ length: 8 }).map((_, cell) => (
                  <Skeleton
                    key={cell}
                    className={`h-4 ${
                      cell === 0 ? "w-32" : cell === 7 ? "w-16" : "flex-1 max-w-[90px]"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

const KPI_STYLES = {
  products: {
    card: "border-orange-200 bg-gradient-to-br from-orange-50 to-white",
    icon: "bg-orange-500 text-white",
    value: "text-zinc-900",
  },
  in: {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
    icon: "bg-emerald-600 text-white",
    value: "text-emerald-700",
  },
  out: {
    card: "border-red-200 bg-gradient-to-br from-red-50 to-white",
    icon: "bg-red-600 text-white",
    value: "text-red-700",
  },
  movements: {
    card: "border-blue-200 bg-gradient-to-br from-blue-50 to-white",
    icon: "bg-blue-600 text-white",
    value: "text-zinc-900",
  },
};

function KpiCard({ label, value, hint, icon: Icon, variant = "products" }) {
  const style = KPI_STYLES[variant] || KPI_STYLES.products;
  return (
    <div
      className={`border shadow-sm rounded-xl p-4 flex flex-col justify-between h-28 relative overflow-hidden ${style.card}`}
    >
      <div className="flex justify-between items-start">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${style.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-semibold tabular-nums tracking-tight ${style.value}`}>
          {value}
        </p>
        {hint ? <p className="text-xs text-zinc-500 mt-0.5">{hint}</p> : null}
      </div>
    </div>
  );
}

function snapshotFromRow(row, tab) {
  if (!row) return null;
  if (tab === "overview") {
    return {
      id: row.id,
      name: row.name,
      categoryName: row.categoryName,
      unit: row.unit,
      currentBalance: row.currentBalance,
      openingStock: row.openingStock,
      unitsInPeriod: row.unitsInPeriod,
      unitsOutPeriod: row.unitsOutPeriod,
      stockStatus: row.stockStatus,
      minStock: row.minStock,
      purchasePrice: row.purchasePrice,
      stockValue: row.stockValue,
    };
  }
  return {
    id: row.productId,
    name: row.product,
    categoryName: row.category,
    unit: row.unit,
  };
}

export default function InventoryStockReport() {
  const [filters, setFilters] = useState(DEFAULT_INVENTORY_FILTERS);
  const [tab, setTab] = useState("overview");
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const stableFilters = useMemo(() => filters, [filters]);

  const overview = useInventoryReport(
    "/api/admin/reports/inventory/overview",
    stableFilters
  );
  const stock = useInventoryReport(
    "/api/admin/reports/inventory/stock",
    stableFilters,
    { paginate: true, enabled: tab === "overview" }
  );
  const movements = useInventoryReport(
    "/api/admin/reports/inventory/movements",
    stableFilters,
    { paginate: true, enabled: tab !== "overview" }
  );

  const kpis = overview.data?.kpis;
  const lookups = overview.data?.lookups || { categories: [] };
  const meta = overview.data?.meta;
  const timezone = meta?.timezone || "Asia/Kolkata";

  const exportQuery = useMemo(
    () =>
      inventoryQueryString({
        ...filters,
        // Always export full movement history, not the active tab filter
        movementType: "ALL",
        page: 1,
      }),
    [filters]
  );

  const rowCount = stock.data?.total ?? kpis?.totalProducts ?? 0;

  const setPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleTabChange = (next) => {
    setTab(next);
    setFilters((prev) => ({
      ...prev,
      page: 1,
      movementType: movementTypeForTab(next),
    }));
  };

  const openProduct = async (productId, row) => {
    if (!productId) return;
    const snapshot = snapshotFromRow(row, tab);
    setSelectedId(productId);
    setProduct(snapshot);
    setHistory([]);
    setDetailLoading(true);
    try {
      const qs = inventoryQueryString(
        {
          ...filters,
          productId,
          categoryId: "ALL",
          search: "",
          stockStatus: "ALL",
          movementType: "ALL",
          page: 1,
          pageSize: 100,
        },
        { paginate: true }
      );
      const [stockRes, moveRes] = await Promise.all([
        fetch(`/api/admin/reports/inventory/stock?${qs}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/admin/reports/inventory/movements?${qs}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      const [stockJson, moveJson] = await Promise.all([
        stockRes.json(),
        moveRes.json(),
      ]);
      if (stockJson.success && stockJson.data?.rows?.[0]) {
        setProduct(stockJson.data.rows[0]);
      }
      if (moveJson.success) {
        setHistory(moveJson.data?.rows || []);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load product details");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeSheet = (open) => {
    if (open) return;
    setSelectedId(null);
    setProduct(null);
    setHistory([]);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Inventory & Stock Reports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track inventory additions, removals and stock movement history.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 bg-white"
          onClick={() => setExportOpen(true)}
          disabled={overview.loading || !overview.data}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export
        </Button>
      </div>

      <InventoryFilters
        value={filters}
        onChange={setFilters}
        categories={lookups.categories}
        refreshing={overview.loading || stock.loading || movements.loading}
        onRefresh={() => {
          overview.reload();
          if (tab === "overview") stock.reload();
          else movements.reload();
        }}
      />

      {overview.loading && !overview.data ? (
        <InventoryReportSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Total Products"
              value={kpis?.totalProducts || 0}
              hint={`${kpis?.lowStockCount || 0} low · ${kpis?.outOfStockCount || 0} out`}
              icon={Package}
              variant="products"
            />
            <KpiCard
              label="Stock In"
              value={`+${qty(kpis?.stockAdded)}`}
              hint="units this period"
              icon={ArrowUpRight}
              variant="in"
            />
            <KpiCard
              label="Stock Out"
              value={`-${qty(kpis?.stockRemoved)}`}
              hint="units this period"
              icon={ArrowDownRight}
              variant="out"
            />
            <KpiCard
              label="Movements"
              value={kpis?.movementCount || 0}
              hint="transactions logged"
              icon={Repeat}
              variant="movements"
            />
          </div>

          <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="h-auto w-full justify-start gap-6 rounded-none bg-transparent p-0 border-b border-zinc-200">
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className={TAB_TRIGGER}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <StockTab
                data={stock.data}
                loading={stock.loading}
                onPage={setPage}
                onSelect={openProduct}
                selectedId={selectedId}
              />
            </TabsContent>
            <TabsContent value="in" className="mt-0">
              <MovementTab
                data={movements.data}
                loading={movements.loading}
                onPage={setPage}
                onSelect={openProduct}
                selectedId={selectedId}
              />
            </TabsContent>
            <TabsContent value="out" className="mt-0">
              <MovementTab
                data={movements.data}
                loading={movements.loading}
                onPage={setPage}
                onSelect={openProduct}
                selectedId={selectedId}
              />
            </TabsContent>
            <TabsContent value="logs" className="mt-0">
              <MovementTab
                data={movements.data}
                loading={movements.loading}
                onPage={setPage}
                onSelect={openProduct}
                selectedId={selectedId}
                showPerformedBy
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <InventoryProductSheet
        open={Boolean(selectedId)}
        onOpenChange={closeSheet}
        product={product}
        history={history}
        loading={detailLoading}
        timezone={timezone}
        dateFrom={meta?.dateFrom}
        dateTo={meta?.dateTo}
      />

      <InventoryExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        exportQuery={exportQuery}
        dateFrom={meta?.dateFrom || filters.dateFrom || "report"}
        dateTo={meta?.dateTo || filters.dateTo || "report"}
        disabled={overview.loading}
        rowCount={rowCount}
      />
    </div>
  );
}
