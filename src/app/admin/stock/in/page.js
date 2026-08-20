"use client";

import React, { useState, useEffect } from "react";
import {
  PackagePlus,
  Receipt,
  ClipboardList,
  TrendingUp,
  CalendarClock,
  Eye,
  MoreHorizontal,
  Edit,
  Trash,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DeleteDialog from "@/components/common/DeleteDialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

function newLine() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    menuHead: "",
    productName: "",
    qty: "",
    unitPrice: "",
    value: "",
    selectedProductDetails: null,
    openingBalance: "0.00",
    openingStock: "",
    openingStockPrice: "",
    filteredProducts: [],
  };
}

function productIdOf(product) {
  return product?._id?.toString() || product?.toString() || "";
}

function categoryIdOf(product) {
  return (
    product?.category?._id?.toString() ||
    product?.category?.toString() ||
    ""
  );
}

export default function StockInPage() {
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [stockIns, setStockIns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);

  const [invoice, setInvoice] = useState({
    stockDate: new Date(),
    invoiceNumber: "",
    tax: "",
    invoiceAmount: "",
  });
  const [lines, setLines] = useState([newLine()]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes, stockInRes] = await Promise.all([
        fetch("/api/stock/category"),
        fetch("/api/stock/products"),
        fetch("/api/stock/in"),
      ]);

      const [catJson, prodJson, stockInJson] = await Promise.all([
        catRes.json(),
        prodRes.json(),
        stockInRes.json(),
      ]);

      if (catJson.success) setCategories(catJson.data);
      if (prodJson.success) setAllProducts(prodJson.data);
      if (stockInJson.success) setStockIns(stockInJson.data);
    } catch (error) {
      toast.error("Failed to fetch initial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchStockIns = async () => {
    try {
      const res = await fetch("/api/stock/in");
      const json = await res.json();
      if (json.success) setStockIns(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  const calculateOpeningBalance = async (productId) => {
    if (!productId) return "0.00";
    try {
      const [inRes, outRes] = await Promise.all([
        fetch(`/api/stock/in?productId=${productId}`),
        fetch(`/api/stock/out?productId=${productId}`),
      ]);
      const [inJson, outJson] = await Promise.all([
        inRes.json(),
        outRes.json(),
      ]);

      let totalIn = 0;
      let totalOut = 0;

      if (inJson.success) {
        totalIn = (inJson.data || []).reduce((sum, entry) => {
          return (
            sum +
            (entry.items || []).reduce((lineSum, item) => {
              return productIdOf(item.product) === productId
                ? lineSum + (Number(item.quantity) || 0)
                : lineSum;
            }, 0)
          );
        }, 0);
      }
      if (outJson.success) {
        totalOut = (outJson.data || []).reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0
        );
      }

      const product = allProducts.find((p) => p._id === productId);
      const openingSeed = Number(product?.openingStock) || 0;
      return (openingSeed + totalIn - totalOut).toFixed(2);
    } catch (error) {
      console.error("Failed to calculate balance");
      return "0.00";
    }
  };

  const updateLine = (lineId, patch) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    );
  };

  const handleCategoryChange = (lineId, categoryId) => {
    updateLine(lineId, {
      menuHead: categoryId,
      productName: "",
      selectedProductDetails: null,
      openingBalance: "0.00",
      openingStock: "",
      openingStockPrice: "",
      filteredProducts: allProducts.filter(
        (p) => categoryIdOf(p) === categoryId
      ),
    });
  };

  const handleProductChange = async (lineId, productId) => {
    const product = allProducts.find((p) => p._id === productId);
    updateLine(lineId, {
      productName: productId,
      selectedProductDetails: product || null,
      openingBalance: "…",
      openingStock:
        product?.openingStock === null || product?.openingStock === undefined
          ? ""
          : String(product.openingStock),
      openingStockPrice:
        product?.openingStockPrice === null ||
        product?.openingStockPrice === undefined
          ? ""
          : String(product.openingStockPrice),
    });
    const balance = await calculateOpeningBalance(productId);
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId && line.productName === productId
          ? { ...line, openingBalance: balance }
          : line
      )
    );
  };

  const handleLineNumberChange = (lineId, field, rawValue) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, [field]: rawValue };
        const qty = Number(field === "qty" ? rawValue : next.qty);
        const unitPrice = Number(
          field === "unitPrice" ? rawValue : next.unitPrice
        );
        const value = Number(field === "value" ? rawValue : next.value);

        if (
          (field === "qty" || field === "unitPrice") &&
          rawValue !== "" &&
          !Number.isNaN(qty) &&
          !Number.isNaN(unitPrice)
        ) {
          next.value = (qty * unitPrice).toFixed(2);
        }
        if (
          field === "value" &&
          rawValue !== "" &&
          !Number.isNaN(qty) &&
          qty &&
          !Number.isNaN(value)
        ) {
          next.unitPrice = (value / qty).toFixed(2);
        }
        return next;
      })
    );
  };

  const addProductLine = () => {
    setLines((prev) => [...prev, newLine()]);
  };

  const removeProductLine = (lineId) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== lineId)));
  };

  const resetForm = () => {
    setEditingId(null);
    setInvoice({
      stockDate: new Date(),
      invoiceNumber: "",
      tax: "",
      invoiceAmount: "",
    });
    setLines([newLine()]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice.stockDate) {
      toast.error("Date received is required");
      return;
    }

    const prepared = lines.map((line) => ({
      product: line.productName,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      value: line.value,
      openingStock: line.openingStock === "" ? null : line.openingStock,
      openingStockPrice:
        line.openingStockPrice === "" ? null : line.openingStockPrice,
    }));

    const incomplete = prepared.some(
      (item) => !item.product || item.quantity === "" || item.unitPrice === "" || item.value === ""
    );
    if (incomplete) {
      toast.error("Each product line needs product, quantity, per-piece value, and total");
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/stock/in/${editingId}` : "/api/stock/in";
      const method = editingId ? "PUT" : "POST";

      const payload = {
        date: invoice.stockDate.toISOString(),
        invoiceNumber: invoice.invoiceNumber || undefined,
        tax: invoice.tax || undefined,
        invoiceAmount: invoice.invoiceAmount || undefined,
        items: prepared,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          editingId ? "Stock In updated successfully" : "Stock In entry created"
        );
        resetForm();
        fetchStockIns();
        // Refresh products so opening stock edits show next time
        try {
          const prodRes = await fetch("/api/stock/products");
          const prodJson = await prodRes.json();
          if (prodJson.success) setAllProducts(prodJson.data);
        } catch {
          /* ignore */
        }
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (entry) => {
    setEditingId(entry._id);
    setInvoice({
      stockDate: new Date(entry.date),
      invoiceNumber: entry.invoiceNumber || "",
      tax: entry.tax?.toString() || "",
      invoiceAmount: entry.invoiceAmount?.toString() || "",
    });

    const items = entry.items?.length ? entry.items : [];
    const nextLines = await Promise.all(
      (items.length ? items : [null]).map(async (item) => {
        if (!item) return newLine();
        const prodId = productIdOf(item.product);
        const product =
          allProducts.find((p) => p._id === prodId) || item.product || null;
        const catId = categoryIdOf(product);
        const qty = item.quantity?.toString() || "";
        const unitPrice =
          item.unitPrice !== undefined && item.unitPrice !== null
            ? Number(item.unitPrice).toFixed(2)
            : "";
        const value =
          item.value !== undefined && item.value !== null
            ? Number(item.value).toFixed(2)
            : "";
        const balance = prodId ? await calculateOpeningBalance(prodId) : "0.00";
        return {
          ...newLine(),
          menuHead: catId,
          productName: prodId,
          qty,
          unitPrice,
          value,
          selectedProductDetails: product,
          openingBalance: balance,
          openingStock:
            product?.openingStock === null || product?.openingStock === undefined
              ? ""
              : String(product.openingStock),
          openingStockPrice:
            product?.openingStockPrice === null ||
            product?.openingStockPrice === undefined
              ? ""
              : String(product.openingStockPrice),
          filteredProducts: allProducts.filter((p) => categoryIdOf(p) === catId),
        };
      })
    );

    setLines(nextLines.length ? nextLines : [newLine()]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewStockIn = (entry) => {
    setViewEntry(entry);
    setTimeout(() => setViewOpen(true), 100);
  };

  const openDeleteDialog = (id) => {
    setItemToDelete(id);
    setTimeout(() => setDeleteOpen(true), 100);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`/api/stock/in/${itemToDelete}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Entry deleted successfully");
        fetchStockIns();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to delete entry");
    } finally {
      setDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  const viewItems = viewEntry?.items || [];
  const viewTotal = viewItems.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  return (
    <div
      className="flex flex-col overflow-hidden min-h-screen"
      style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}
    >
      <Toaster position="top-right" richColors />

      <DeleteDialog
        isOpen={deleteOpen}
        onOpenChange={(open) => setDeleteOpen(open)}
        onConfirm={confirmDelete}
        title="Delete Stock In Entry"
        description="Are you sure you want to delete this stock invoice? This will affect the inventory balance for every product on it."
      />

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-zinc-900">
              Stock In Invoice
            </DialogTitle>
            <DialogDescription>
              Full details for this incoming stock invoice.
            </DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Invoice
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-zinc-900">
                    {viewEntry.invoiceNumber || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Date
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-zinc-900">
                    {new Date(viewEntry.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Tax
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-zinc-900">
                    {viewEntry.tax != null ? money(viewEntry.tax) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Invoice Amount
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-blue-900">
                    {viewEntry.invoiceAmount != null
                      ? money(viewEntry.invoiceAmount)
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">
                        Product
                      </TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">
                        Type / Unit
                      </TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 text-right">
                        Per Piece
                      </TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 text-right">
                        Qty
                      </TableHead>
                      <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 text-right">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-[14px] text-zinc-900">
                              {item.product?.name || "Unknown"}
                            </span>
                            <span className="text-[12px] text-zinc-500">
                              {item.product?.category?.name || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] font-bold rounded">
                              {item.product?.type?.name || "—"}
                            </span>
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] font-bold rounded">
                              {item.product?.unit?.name || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-zinc-800">
                          {money(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-zinc-800">
                          {item.quantity} {item.product?.unit?.name || ""}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">
                          {money(item.unitPrice)} × {item.quantity} ={" "}
                          {money(item.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Line Total
                  </p>
                  <p className="text-[22px] font-bold text-emerald-900">
                    {money(viewTotal)}
                  </p>
                </div>
              </div>
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
                Create Stock In
              </h1>
              <p
                className="text-[15px] mt-1"
                style={{ color: PALETTE.inkMuted }}
              >
                Log incoming stock. One invoice can include multiple products.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center w-full gap-8"
          >
            <div className="space-y-6 w-full">
              <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#1e40af]" /> Purchase
                    Invoice
                  </CardTitle>
                  <CardDescription className="text-[14px]">
                    Shared invoice details for every product on this receipt.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Date Received
                      </label>
                      <DatePicker
                        value={invoice.stockDate}
                        onChange={(date) =>
                          setInvoice({ ...invoice, stockDate: date })
                        }
                        className="border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Invoice Number
                      </label>
                      <Input
                        type="text"
                        name="invoiceNumber"
                        placeholder="INV-XXXXX"
                        value={invoice.invoiceNumber}
                        onChange={(e) =>
                          setInvoice({ ...invoice, invoiceNumber: e.target.value })
                        }
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Tax Amount
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        name="tax"
                        placeholder="$0.00"
                        value={invoice.tax}
                        onChange={(e) =>
                          setInvoice({ ...invoice, tax: e.target.value })
                        }
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-zinc-900">
                        Total Invoice Amount
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        name="invoiceAmount"
                        placeholder="$0.00"
                        value={invoice.invoiceAmount}
                        onChange={(e) =>
                          setInvoice({
                            ...invoice,
                            invoiceAmount: e.target.value,
                          })
                        }
                        className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-zinc-900">
                  Products on this invoice
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addProductLine}
                  className="h-10 border-zinc-200 text-zinc-800 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Product
                </Button>
              </div>

              {lines.map((line, index) => (
                <div key={line.id} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-1">
                  <div className="flex items-center justify-between px-4 pt-3">
                    <span className="text-[13px] font-bold uppercase tracking-wider text-zinc-500">
                      Product {index + 1}
                    </span>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProductLine(line.id)}
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <Card className="shadow-none border-0 overflow-hidden">
                    <CardHeader className="bg-zinc-50/50 border-y border-zinc-100 pb-4">
                      <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[#1e40af]" />{" "}
                        Product Selection
                      </CardTitle>
                      <CardDescription className="text-[14px]">
                        Choose the product and view its current opening balance.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-zinc-900">
                            Stock Menu Head{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={line.menuHead}
                            onValueChange={(v) =>
                              handleCategoryChange(line.id, v)
                            }
                          >
                            <SelectTrigger className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-60 overflow-y-auto">
                              {categories.map((c) => (
                                <SelectItem key={c._id} value={c._id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-zinc-900">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={line.productName}
                            onValueChange={(v) =>
                              handleProductChange(line.id, v)
                            }
                            disabled={!line.menuHead}
                          >
                            <SelectTrigger className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-2 focus:ring-[#F97316]">
                              <SelectValue
                                placeholder={
                                  line.menuHead
                                    ? "Select Product"
                                    : "Select Category first"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-60 overflow-y-auto">
                              {line.filteredProducts.map((p) => (
                                <SelectItem key={p._id} value={p._id}>
                                  {p.name}
                                  {p.type?.name ? ` — ${p.type.name}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {line.selectedProductDetails && (
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex flex-col justify-center">
                            <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Product Type / Measure
                            </span>
                            <div className="flex gap-2">
                              <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[12px] font-bold rounded-md">
                                {line.selectedProductDetails.type?.name ||
                                  "Unknown"}
                              </span>
                              <span className="px-3 py-1 bg-zinc-200 text-zinc-700 text-[12px] font-bold rounded-md">
                                {line.selectedProductDetails.unit?.name ||
                                  "Unknown"}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col justify-center relative overflow-hidden">
                            <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-blue-100 opacity-50" />
                            <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-1 relative z-10">
                              Current Balance
                            </span>
                            <span className="text-[24px] font-bold text-blue-900 relative z-10">
                              {line.openingBalance}{" "}
                              {line.selectedProductDetails.unit?.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-0 overflow-hidden">
                    <CardHeader className="bg-zinc-50/50 border-y border-zinc-100 pb-4">
                      <CardTitle className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
                        <PackagePlus className="w-5 h-5 text-[#1e40af]" /> Stock
                        Entry
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {line.selectedProductDetails && (
                        <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50/60 p-4">
                          <p className="text-[12px] font-bold uppercase tracking-wider text-amber-800 mb-3">
                            Opening stock (optional — edit to update product)
                          </p>
                          <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="space-y-2 w-full sm:w-40">
                              <label className="text-[14px] font-semibold text-zinc-900">
                                Opening qty
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0"
                                value={line.openingStock}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    openingStock: e.target.value,
                                  })
                                }
                                className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                              />
                            </div>
                            <div className="space-y-2 flex-1">
                              <label className="text-[14px] font-semibold text-zinc-900">
                                Opening price ($)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={line.openingStockPrice}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    openingStockPrice: e.target.value,
                                  })
                                }
                                className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="space-y-2 w-full sm:w-32">
                          <label className="text-[14px] font-semibold text-zinc-900">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="QTY"
                            value={line.qty}
                            onChange={(e) =>
                              handleLineNumberChange(
                                line.id,
                                "qty",
                                e.target.value
                              )
                            }
                            className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                          />
                        </div>
                        <div className="space-y-2 flex-1">
                          <label className="text-[14px] font-semibold text-zinc-900">
                            Per Piece Value ($){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="25.00"
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleLineNumberChange(
                                line.id,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                          />
                        </div>
                        <div className="space-y-2 flex-1">
                          <label className="text-[14px] font-semibold text-zinc-900">
                            Total Value ($){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={line.value}
                            onChange={(e) =>
                              handleLineNumberChange(
                                line.id,
                                "value",
                                e.target.value
                              )
                            }
                            className="h-11 text-[15px] bg-white border-zinc-200 focus:ring-[#F97316] font-medium"
                          />
                        </div>
                      </div>
                      {line.qty && line.unitPrice && (
                        <p className="mt-3 text-[13px] font-semibold text-emerald-700">
                          {money(line.unitPrice)} × {line.qty} ={" "}
                          {money(line.value)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}

              <div className="flex flex-col justify-end space-y-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-14 text-[16px] font-bold text-white transition-transform hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: "#1e40af" }}
                >
                  {saving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                  {editingId ? "Update Stock In" : "Save Stock In"}
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={saving}
                    className="w-full h-12 text-[15px] font-bold transition-transform hover:scale-[1.02]"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </div>
          </form>

          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden mt-8">
            <CardHeader className="px-6 py-5 border-b border-zinc-200 flex flex-row items-center justify-between">
              <CardTitle className="text-[16px] font-bold text-zinc-900">
                Recent Stock In Records
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Product
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Date
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Qty & Value
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Invoice
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
                          <Skeleton className="h-10 w-full rounded-md" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-5 w-[100px]" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-8 w-[120px]" />
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-8 w-[100px]" />
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Skeleton className="h-8 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : stockIns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-zinc-500 text-[14px]"
                      >
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockIns.map((s) => {
                      const items = s.items || [];
                      return (
                        <TableRow
                          key={s._id}
                          className="hover:bg-zinc-50 transition-colors"
                        >
                          <TableCell className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0">
                                <PackagePlus className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex flex-col gap-1">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex flex-col">
                                    <span className="font-bold text-[15px] text-zinc-900">
                                      {item.product?.name || "Unknown"}
                                    </span>
                                    <span className="text-[12px] text-zinc-500 font-medium">
                                      {item.product?.category?.name || "Unknown"}
                                      {item.product?.type?.name
                                        ? ` · ${item.product.type.name}`
                                        : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6">
                            <div className="flex items-center gap-2">
                              <CalendarClock className="w-4 h-4 text-zinc-400" />
                              <span className="font-semibold text-zinc-700 text-[14px]">
                                {new Date(s.date).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6">
                            <div className="flex flex-col gap-2">
                              {items.map((item, idx) => (
                                <div key={idx} className="flex flex-col">
                                  <span className="font-bold text-zinc-900 text-[14px]">
                                    {money(item.unitPrice)} × {item.quantity}{" "}
                                    <span className="text-[12px] text-zinc-500 font-medium">
                                      {item.product?.unit?.name}
                                    </span>
                                  </span>
                                  <span className="text-[13px] font-semibold text-emerald-600">
                                    {money(item.value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="px-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-semibold text-zinc-900">
                                {s.invoiceNumber || "-"}
                              </span>
                              {s.invoiceAmount != null && s.invoiceAmount !== "" && (
                                <span className="text-[12px] text-zinc-500 font-medium">
                                  Amt: {money(s.invoiceAmount)}
                                </span>
                              )}
                            </div>
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
                                  onSelect={() => handleEdit(s)}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[14px] font-medium cursor-pointer"
                                  onSelect={() => handleViewStockIn(s)}
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View Stock IN
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                  onSelect={() => openDeleteDialog(s._id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
