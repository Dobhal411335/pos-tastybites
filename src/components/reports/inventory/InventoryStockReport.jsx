"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryFilters from "./InventoryFilters";
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

const PRESETS = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "CUSTOM", label: "Custom Range" },
];

const TAB_TRIGGER =
  "rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 pt-0 shadow-none text-zinc-500 hover:text-zinc-900 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:shadow-none";

function ymdToDate(ymd) {
  if (!ymd) return undefined;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function dateToYmd(date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function movementTypeForTab(tab) {
  if (tab === "in") return "STOCK_IN";
  if (tab === "out") return "STOCK_OUT";
  return "ALL";
}

function KpiCard({ label, value, hint, icon: Icon, tone = "neutral" }) {
  const valueClass =
    tone === "in"
      ? "text-emerald-700"
      : tone === "out"
        ? "text-red-700"
        : "text-zinc-900";
  const iconClass =
    tone === "in"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "out"
        ? "bg-red-50 text-red-700"
        : "bg-zinc-100 text-zinc-600";

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col justify-between h-28 relative overflow-hidden">
      <div className="flex justify-between items-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-semibold tabular-nums tracking-tight ${valueClass}`}>
          {value}
        </p>
        {hint ? <p className="text-sm text-zinc-500 mt-0.5">{hint}</p> : null}
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
      unitsInPeriod: row.unitsInPeriod,
      unitsOutPeriod: row.unitsOutPeriod,
      stockStatus: row.stockStatus,
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
  const [downloading, setDownloading] = useState(null);
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

  const setPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const patchFilters = (next) => {
    setFilters((prev) => ({ ...prev, ...next, page: 1 }));
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
          pageSize: 20,
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
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.preset}
            onValueChange={(preset) => {
              if (preset === "CUSTOM") {
                const today = format(new Date(), "yyyy-MM-dd");
                patchFilters({
                  preset,
                  dateFrom: filters.dateFrom || today,
                  dateTo: filters.dateTo || today,
                });
              } else {
                patchFilters({ preset });
              }
            }}
          >
            <SelectTrigger className="h-10 w-[180px] bg-white border-zinc-200">
              <CalendarDays className="h-4 w-4 text-zinc-500" />
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.preset === "CUSTOM" ? (
            <div className="flex items-center gap-2">
              <DatePicker
                value={ymdToDate(filters.dateFrom)}
                onChange={(d) => patchFilters({ dateFrom: dateToYmd(d) })}
                className="h-10 w-[160px]"
              />
              <DatePicker
                value={ymdToDate(filters.dateTo)}
                onChange={(d) => patchFilters({ dateTo: dateToYmd(d) })}
                className="h-10 w-[160px]"
              />
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10"
                disabled={!!downloading || overview.loading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload("excel")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <InventoryFilters
        value={filters}
        onChange={setFilters}
        categories={lookups.categories}
      />

      {overview.loading && !overview.data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Total Products"
              value={kpis?.totalProducts || 0}
              icon={Package}
            />
            <KpiCard
              label="Stock In"
              value={`+${qty(kpis?.stockAdded)}`}
              hint="units"
              icon={ArrowUpRight}
              tone="in"
            />
            <KpiCard
              label="Stock Out"
              value={`-${qty(kpis?.stockRemoved)}`}
              hint="units"
              icon={ArrowDownRight}
              tone="out"
            />
            <KpiCard
              label="Movements"
              value={kpis?.movementCount || 0}
              icon={Repeat}
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
      />
    </div>
  );
}
