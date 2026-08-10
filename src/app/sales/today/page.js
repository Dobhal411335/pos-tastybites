"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Clock, ChevronRight, X, 
  Receipt, ShoppingBag, Loader2, ArrowLeft, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUSES = ["All", "PENDING", "CONFIRMED", "CANCELLED", "PAID"];

function getPlacerName(order) {
  if (order.processedByName) return order.processedByName;
  const p = order.processedBy;
  if (p && typeof p === "object") {
    return p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || null;
  }
  return null;
}

function getOrderGrandTotal(order) {
  return Number(order?.totalAmount || 0) + Number(order?.tipAmount || 0);
}

export default function TodayOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/orders/employee?today=true");
      const data = await res.json();
      if (data.success) {
        const next = data.data || [];
        setOrders(next);
        setSelectedOrder((prev) => {
          if (!prev) return null;
          return next.find((o) => o._id === prev._id) || null;
        });
      }
    } catch (err) {
      toast.error("Failed to fetch today's orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchOrders({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchOrders]);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING": return "bg-amber-100 text-amber-700";
      case "CONFIRMED": return "bg-emerald-100 text-emerald-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      case "PAID": return "bg-blue-100 text-blue-700";
      case "COMPLETED": return "bg-emerald-100 text-emerald-700";
      default: return "bg-zinc-100 text-zinc-700";
    }
  };

  const getPaymentColor = (paymentStatus) => {
    switch (paymentStatus?.toUpperCase()) {
      case "PAID": return "bg-emerald-100 text-emerald-700";
      case "PARTIAL": return "bg-amber-100 text-amber-700";
      case "REFUNDED": return "bg-red-100 text-red-700";
      default: return "bg-zinc-100 text-zinc-600";
    }
  };

  const getTypeIcon = (source) => {
    if (source === "ONLINE") return <ShoppingBag className="w-4 h-4 text-zinc-400" />;
    return <Receipt className="w-4 h-4 text-zinc-400" />;
  };

  const filteredOrders = orders.filter((o) => {
    const matchesTab = activeTab === "All" || o.status?.toUpperCase() === activeTab;
    const placer = getPlacerName(o) || "";
    const searchString = `${o.orderNumber || ""} ${o.tableNo || ""} ${o.guestName || ""} ${o.source || ""} ${placer}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const closePanel = () => setSelectedOrder(null);

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-50 font-sans h-screen">
      
      {/* MAIN LIST AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedOrder ? "pr-100 xl:pr-[450px]" : ""}`}>
        
        {/* HEADER & FILTERS */}
        <div className="bg-white p-6 border-b border-zinc-200 shrink-0 shadow-sm z-10">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div>
              <Button variant="ghost" onClick={() => router.push("/sales/floor")} className="mb-2 -ml-3 text-zinc-500 hover:text-zinc-900">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Floor
              </Button>
              <h1 className="text-2xl font-bold text-zinc-900">Today&apos;s Orders</h1>
              <p className="text-sm text-zinc-500 font-medium mt-1">Track and manage all orders placed today.</p>
            </div>
            
            <div className="flex gap-3 items-end">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-zinc-200"
                onClick={() => fetchOrders({ silent: true })}
                disabled={refreshing || loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  placeholder="Search ID, Name or Table..." 
                  className="pl-9 w-full md:w-64 bg-zinc-50 border-none rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-orange-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* STATUS SCROLL */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  activeTab === status 
                    ? "bg-zinc-900 text-white shadow-sm" 
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-3">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 border-dashed">
                <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-zinc-900">No orders found today</h3>
                <p className="text-zinc-500 text-sm mt-1">Orders placed today will appear here.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const placerName = getPlacerName(order);
                const tip = Number(order.tipAmount || 0);
                return (
                  <div 
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                      selectedOrder?._id === order._id 
                        ? "border-orange-500 ring-1 ring-orange-500 shadow-md" 
                        : "border-zinc-200 hover:border-orange-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                        {getTypeIcon(order.source)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-zinc-900">Order #{order.orderNumber}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                          <span className="font-bold text-zinc-600">{order.tableNo || "Takeaway"}</span>
                          {order.guestName && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                              <span className="font-semibold text-zinc-500">{order.guestName}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />{" "}
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>{order.source}</span>
                          {placerName && <span className="normal-case tracking-normal">{placerName}</span>}
                          <span>{order.items?.length || 0} Items</span>
                          {tip > 0 && <span className="text-orange-600 normal-case tracking-normal">Tip ${tip.toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end border-t sm:border-none pt-3 sm:pt-0 border-zinc-100 mt-2 sm:mt-0">
                      <div className="text-right">
                        <div className="font-bold text-lg text-zinc-900">${getOrderGrandTotal(order).toFixed(2)}</div>
                      </div>
                      {/* <Badge className={`${getPaymentColor(order.paymentStatus)} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-none shadow-none`}>
                        {order.paymentStatus || "UNPAID"}
                      </Badge> */}
                      <Badge className={`${getStatusColor(order.status)} px-3 py-1 text-[11px] font-bold uppercase tracking-wider border-none shadow-none`}>
                        {order.status}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-orange-500 transition-colors hidden sm:block" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BACKDROP — click outside to close (between nav + footer) */}
      {selectedOrder && (
        <div
          className="fixed top-16 bottom-12 left-0 right-0 bg-black/20 z-20"
          onClick={closePanel}
          aria-hidden="true"
        />
      )}

      {/* SLIDE-IN DETAIL PANEL — inset so nav (top-16) and footer (bottom-12) stay clear */}
      <div 
        className={`fixed top-16 bottom-12 right-0 w-[400px] xl:w-[450px] bg-white border-l border-zinc-200 shadow-2xl transition-transform duration-300 z-30 flex flex-col ${
          selectedOrder ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {selectedOrder && (
          <>
            {/* Panel Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-start bg-zinc-50 shrink-0 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-bold text-zinc-900">Order #{selectedOrder.orderNumber}</h2>
                  <Badge className={`${getStatusColor(selectedOrder.status)} text-[10px] uppercase font-bold px-2 py-0.5 border-none shadow-none`}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-zinc-800">
                  {selectedOrder.tableNo ? `Table: ${selectedOrder.tableNo}` : "Takeaway"} • {selectedOrder.source}
                  {selectedOrder.guestName && ` • Guest: ${selectedOrder.guestName}`}
                </p>
                {getPlacerName(selectedOrder) && (
                  <p className="text-xs font-medium text-zinc-400 mt-1">
                    By {getPlacerName(selectedOrder)}
                    {selectedOrder.processedByRole ? ` (${selectedOrder.processedByRole})` : ""}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="rounded-md border border-zinc-500 bg-red-500 text-white hover:bg-red-500 hover:text-white shrink-0" onClick={closePanel}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Panel Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

              {/* Payment / tip meta */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Payment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Status</span>
                    <Badge className={`${getPaymentColor(selectedOrder.paymentStatus)} text-[10px] uppercase font-bold px-2 py-0.5 border-none shadow-none`}>
                      {selectedOrder.paymentStatus || "UNPAID"}
                    </Badge>
                  </div>
                  {selectedOrder.paymentMethod && (
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>Method</span>
                      <span className="text-zinc-800">{selectedOrder.paymentMethod}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span>Tip</span>
                    <span className="text-zinc-800">${Number(selectedOrder.tipAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-500"></div>
              
              {/* Items */}
              <div>
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex gap-3 min-w-0">
                        <span className="font-bold text-zinc-900 shrink-0">{item.qty}x</span>
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-800 block">{item.name}</span>
                          {item.size && item.size !== "Standard" && (
                            <span className="text-[12px] mt-1 text-zinc-800 block">Variant: {item.size}</span>
                          )}
                          {item.preparationStyle && (
                            <span className="text-[12px] mt-1 text-zinc-900 font-semibold italic">Style: {item.preparationStyle}</span>
                          )}
                          {item.options?.map((opt, i) => (
                            <span key={i} className="text-[12px] mt-1 text-zinc-900 font-semibold block italic">+ {opt}</span>
                          ))}
                        </div>
                      </div>
                      <span className="font-semibold text-zinc-900 shrink-0 ml-3">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.specialNote && (
                <>
                  <div className="h-px bg-zinc-100"></div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Note</h3>
                    <p className="text-sm text-zinc-600">{selectedOrder.specialNote}</p>
                  </div>
                </>
              )}

              <div className="h-px bg-zinc-100"></div>

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span className="text-zinc-800">Subtotal</span>
                  <span className="text-zinc-900">${(selectedOrder.subTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span className="text-zinc-800">Tax</span>
                  <span className="text-zinc-900">${(selectedOrder.taxTotal || 0).toFixed(2)}</span>
                </div>
                {Number(selectedOrder.discountTotal || 0) > 0 && (
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span className="text-zinc-800">Discount{selectedOrder.discountCode ? ` (${selectedOrder.discountCode})` : ""}</span>
                    <span className="text-zinc-900">-${Number(selectedOrder.discountTotal).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span className="text-zinc-800">Tip</span>
                  <span className="text-zinc-900">${Number(selectedOrder.tipAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-zinc-900 pt-2 border-t border-zinc-100 mt-2">
                  <span className="text-zinc-800">Total</span>
                  <span>${getOrderGrandTotal(selectedOrder).toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Footer Close */}
            <div className="p-4 border-t border-zinc-100 shrink-0 bg-white">
              <Button
                variant="outline"
                className="w-full h-11 rounded-md border-zinc-500 bg-red-500 text-white hover:bg-red-500 hover:text-white font-bold"
                onClick={closePanel}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
