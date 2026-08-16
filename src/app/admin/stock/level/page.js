"use client";

import React, { useState, useEffect } from "react";
import {
  Edit,
  Eye,
  CalendarClock,
  RefreshCw,
  MoreHorizontal,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Loader2,
  PackagePlus,
  PackageMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import StockLevelEmailDialog from "@/components/stock/StockLevelEmailDialog";

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

function productIdOf(product) {
  return product?._id?.toString() || product?.toString() || "";
}

export default function StockLevelPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [searchMenuHead, setSearchMenuHead] = useState("all");
  const [searchType, setSearchType] = useState("all");
  const [stockLevels, setStockLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [defaultEmail, setDefaultEmail] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewIns, setViewIns] = useState([]);
  const [viewOuts, setViewOuts] = useState([]);

  const fetchLookups = async () => {
    try {
      const [catRes, typeRes] = await Promise.all([
        fetch("/api/stock/category"),
        fetch("/api/stock/settings?type=productType"),
      ]);
      const [catJson, typeJson] = await Promise.all([
        catRes.json(),
        typeRes.json(),
      ]);
      if (catJson.success) setCategories(catJson.data);
      if (typeJson.success) setProductTypes(typeJson.data);
    } catch (error) {
      console.error("Failed to fetch filters");
    }
  };

  const fetchStockLevels = async (categoryFilter, typeFilter) => {
    try {
      setLoading(true);
      const url = new URL("/api/stock/level", window.location.origin);
      if (categoryFilter && categoryFilter !== "all") {
        url.searchParams.append("category", categoryFilter);
      }
      if (typeFilter && typeFilter !== "all") {
        url.searchParams.append("type", typeFilter);
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStockLevels(json.data.levels || []);
        if (json.data.restaurantEmail) {
          setDefaultEmail(json.data.restaurantEmail);
        }
      }
    } catch (error) {
      toast.error("Failed to load stock levels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchStockLevels(searchMenuHead, searchType);
  }, [searchMenuHead, searchType]);

  const handleEditRedirect = (id) => {
    router.push(`/admin/stock/products?edit=${id}`);
  };

  const handleViewProduct = async (row) => {
    setViewProduct(row);
    setTimeout(() => setViewOpen(true), 100);
    setViewLoading(true);
    setViewIns([]);
    setViewOuts([]);
    try {
      const [inRes, outRes] = await Promise.all([
        fetch(`/api/stock/in?productId=${row._id}`),
        fetch(`/api/stock/out?productId=${row._id}`),
      ]);
      const [inJson, outJson] = await Promise.all([
        inRes.json(),
        outRes.json(),
      ]);

      const pid = row._id.toString();
      const inLines = [];
      if (inJson.success) {
        for (const invoice of inJson.data || []) {
          for (const item of invoice.items || []) {
            if (productIdOf(item.product) === pid) {
              inLines.push({
                _id: `${invoice._id}-${inLines.length}`,
                date: invoice.date,
                invoiceNumber: invoice.invoiceNumber,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                value: item.value,
                unit: item.product?.unit?.name || row.unit?.name,
              });
            }
          }
        }
      }
      setViewIns(inLines);
      setViewOuts(outJson.success ? outJson.data || [] : []);
    } catch (error) {
      toast.error("Failed to load product history");
    } finally {
      setViewLoading(false);
    }
  };

  const filterQuery = () => {
    const qs = new URLSearchParams();
    if (searchMenuHead && searchMenuHead !== "all") {
      qs.set("category", searchMenuHead);
    }
    if (searchType && searchType !== "all") {
      qs.set("type", searchType);
    }
    const str = qs.toString();
    return str ? `?${str}` : "";
  };

  const handleDownload = async (kind) => {
    setDownloading(kind);
    try {
      const res = await fetch(`/api/stock/level/${kind}${filterQuery()}`, {
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
      const date = new Date().toISOString().slice(0, 10);
      a.download = `Stock-Level-${date}.${kind === "excel" ? "xlsx" : "pdf"}`;
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
    <div
      className="flex flex-col overflow-hidden min-h-screen"
      style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}
    >
      <Toaster position="top-right" richColors />

      <StockLevelEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        defaultEmail={defaultEmail}
        category={searchMenuHead}
        type={searchType}
      />

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-zinc-900">
              {viewProduct?.name || "Product"} history
            </DialogTitle>
            <DialogDescription>
              All stock in and stock out movements for this product.
            </DialogDescription>
          </DialogHeader>
          {viewProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Total In
                  </p>
                  <p className="mt-1 text-[18px] font-bold text-emerald-900">
                    {viewProduct.totalIn} {viewProduct.unit?.name || ""}
                  </p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                    Total Out
                  </p>
                  <p className="mt-1 text-[18px] font-bold text-red-900">
                    {viewProduct.totalOut} {viewProduct.unit?.name || ""}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Balance
                  </p>
                  <p className="mt-1 text-[18px] font-bold text-blue-900">
                    {viewProduct.currentBalance} {viewProduct.unit?.name || ""}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Purchase Cost
                  </p>
                  <p className="mt-1 text-[18px] font-bold text-zinc-900">
                    {money(viewProduct.purchasePrice)}
                  </p>
                </div>
              </div>

              {viewLoading ? (
                <div className="flex items-center justify-center py-10 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading history…
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-[14px] font-bold text-zinc-900 mb-2 flex items-center gap-2">
                      <PackagePlus className="w-4 h-4 text-blue-600" />
                      Stock In
                    </h3>
                    <div className="rounded-lg border border-zinc-200 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-zinc-50">
                          <TableRow>
                            <TableHead className="text-[11px] font-bold uppercase text-zinc-500">
                              Date
                            </TableHead>
                            <TableHead className="text-[11px] font-bold uppercase text-zinc-500">
                              Invoice
                            </TableHead>
                            <TableHead className="text-[11px] font-bold uppercase text-zinc-500">
                              Qty & Value
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewIns.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center text-zinc-500 text-[13px] py-6"
                              >
                                No stock in records.
                              </TableCell>
                            </TableRow>
                          ) : (
                            viewIns.map((item) => (
                              <TableRow key={item._id}>
                                <TableCell className="text-[13px] font-semibold">
                                  {new Date(item.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-[13px]">
                                  {item.invoiceNumber || "—"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-zinc-900">
                                      {money(item.unitPrice)} × {item.quantity}{" "}
                                      {item.unit || ""}
                                    </span>
                                    <span className="text-[12px] font-semibold text-emerald-600">
                                      {money(item.value)}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[14px] font-bold text-zinc-900 mb-2 flex items-center gap-2">
                      <PackageMinus className="w-4 h-4 text-red-600" />
                      Stock Out
                    </h3>
                    <div className="rounded-lg border border-zinc-200 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-zinc-50">
                          <TableRow>
                            <TableHead className="text-[11px] font-bold uppercase text-zinc-500">
                              Date
                            </TableHead>
                            <TableHead className="text-[11px] font-bold uppercase text-zinc-500">
                              Qty & Value
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewOuts.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className="text-center text-zinc-500 text-[13px] py-6"
                              >
                                No stock out records.
                              </TableCell>
                            </TableRow>
                          ) : (
                            viewOuts.map((item) => (
                              <TableRow key={item._id}>
                                <TableCell className="text-[13px] font-semibold">
                                  {new Date(item.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-zinc-900">
                                      {money(
                                        item.unitPrice ??
                                          (item.quantity
                                            ? Number(item.value) / Number(item.quantity)
                                            : 0)
                                      )}{" "}
                                      × {item.quantity}{" "}
                                      {item.product?.unit?.name || viewProduct.unit?.name || ""}
                                    </span>
                                    <span className="text-[12px] font-semibold text-red-600">
                                      {money(item.value)}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1
                className="text-[32px] font-bold leading-tight"
                style={{ color: PALETTE.ink }}
              >
                Current Stock Level
              </h1>
              <p
                className="text-[15px] mt-1"
                style={{ color: PALETTE.inkMuted }}
              >
                View real-time inventory balances and filter by category or type.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-zinc-200"
                  disabled={loading || !!downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1.5" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white">
                <DropdownMenuItem
                  className="text-[14px] font-medium cursor-pointer"
                  onSelect={() => handleDownload("excel")}
                  disabled={!!downloading || loading}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[14px] font-medium cursor-pointer"
                  onSelect={() => handleDownload("pdf")}
                  disabled={!!downloading || loading}
                >
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[14px] font-medium cursor-pointer"
                  onSelect={() => setEmailOpen(true)}
                  disabled={loading}
                >
                  <Mail className="mr-2 h-4 w-4" /> Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
                <Select
                  value={searchMenuHead}
                  onValueChange={setSearchMenuHead}
                >
                  <SelectTrigger className="w-full h-10 text-[14px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                    <SelectValue placeholder="Search Menu Head" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-full h-10 text-[14px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                    <SelectValue placeholder="Product Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Types</SelectItem>
                    {productTypes.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-[13px] font-semibold text-zinc-500 flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  onClick={() => fetchStockLevels(searchMenuHead, searchType)}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  Live Status
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Product
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">
                      Stock In
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">
                      Stock Out
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">
                      Current Balance
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">
                      Cost
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-5 w-[150px]" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-4 w-[60px] mx-auto" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-4 w-[60px] mx-auto" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-8 w-[80px] mx-auto rounded-md" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-4 w-[50px] mx-auto" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-6 w-[60px] mx-auto rounded-full" />
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Skeleton className="h-8 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : stockLevels.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-zinc-500 text-[14px]"
                      >
                        No inventory records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockLevels.map((s) => (
                      <TableRow
                        key={s._id}
                        className="h-16 hover:bg-zinc-50 transition-colors"
                      >
                        <TableCell className="px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[15px] text-zinc-900">
                              {s.name}
                            </span>
                            <span className="text-[12px] font-medium text-zinc-500">
                              {s.category?.name || "—"}
                              {s.type?.name ? ` · ${s.type.name}` : ""}
                              {s.unit?.name ? ` · ${s.unit.name}` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-[14px] font-bold border border-emerald-100">
                            {s.totalIn}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-red-50 text-red-700 px-3 py-1 rounded-md text-[14px] font-bold border border-red-100">
                            {s.totalOut}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-[15px] font-extrabold border border-blue-100">
                            {s.currentBalance} {s.unit?.name || ""}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <span className="text-[13px] font-bold text-zinc-900">
                            {money(s.purchasePrice)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {s.status ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 bg-white"
                            >
                              <DropdownMenuItem
                                className="text-[14px] font-medium cursor-pointer"
                                onSelect={() => handleViewProduct(s)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium cursor-pointer"
                                onSelect={() => handleEditRedirect(s._id)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
