"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Clock, ChevronRight, X, 
  Receipt, ShoppingBag, Check, CheckCircle2, Loader2, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUSES = ["All", "PENDING", "CONFIRMED", "CANCELLED", "PAID"];

export default function TodayOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // Pass today=true to only fetch today's orders for the restaurant/employee
      const res = await fetch("/api/orders/employee?today=true");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch today's orders.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING": return "bg-amber-100 text-amber-700";
      case "CONFIRMED": return "bg-emerald-100 text-emerald-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      case "PAID": return "bg-blue-100 text-blue-700";
      default: return "bg-zinc-100 text-zinc-700";
    }
  };

  const getTypeIcon = (source, tableNo) => {
    if (source === 'ONLINE') return <ShoppingBag className="w-4 h-4 text-zinc-400" />;
    return <Receipt className="w-4 h-4 text-zinc-400" />;
  };

  const filteredOrders = orders.filter(o => {
    const matchesTab = activeTab === "All" || o.status?.toUpperCase() === activeTab;
    const searchString = `${o.orderNumber || ''} ${o.tableNo || ''} ${o.guestName || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-50 font-sans h-screen">
      
      {/* MAIN LIST AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedOrder ? 'pr-100 xl:pr-[450px]' : ''}`}>
        
        {/* HEADER & FILTERS */}
        <div className="bg-white p-6 border-b border-zinc-200 shrink-0 shadow-sm z-10">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div>
              <Button variant="ghost" onClick={() => router.push("/sales/floor")} className="mb-2 -ml-3 text-zinc-500 hover:text-zinc-900">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Floor
              </Button>
              <h1 className="text-2xl font-bold text-zinc-900">Today's Orders</h1>
              <p className="text-sm text-zinc-500 font-medium mt-1">Track and manage all orders placed today.</p>
            </div>
            
            <div className="flex gap-3 items-end">
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
            {STATUSES.map(status => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  activeTab === status 
                    ? 'bg-zinc-900 text-white shadow-sm' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
              filteredOrders.map((order) => (
                <div 
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                    selectedOrder?._id === order._id 
                      ? 'border-orange-500 ring-1 ring-orange-500 shadow-md' 
                      : 'border-zinc-200 hover:border-orange-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                      {getTypeIcon(order.source, order.tableNo)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">{order.orderNumber}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                        <span className="font-bold text-zinc-600">{order.tableNo || "Takeaway"}</span>
                        {order.guestName && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                            <span className="font-semibold text-zinc-500">{order.guestName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{order.source}</span>
                        <span>{order.items?.length || 0} Items</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end border-t sm:border-none pt-3 sm:pt-0 border-zinc-100 mt-2 sm:mt-0">
                    <div className="font-bold text-lg text-zinc-900">${(order.totalAmount || 0).toFixed(2)}</div>
                    <Badge className={`${getStatusColor(order.status)} px-3 py-1 text-[11px] font-bold uppercase tracking-wider border-none shadow-none`}>
                      {order.status}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-orange-500 transition-colors hidden sm:block" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SLIDE-IN DETAIL PANEL */}
      <div 
        className={`fixed top-0 bottom-0 right-0 w-[400px] xl:w-[450px] bg-white border-l border-zinc-200 shadow-2xl transition-transform duration-300 z-30 flex flex-col ${
          selectedOrder ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedOrder && (
          <>
            {/* Panel Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-zinc-900">{selectedOrder.orderNumber}</h2>
                  <Badge className={`${getStatusColor(selectedOrder.status)} text-[10px] uppercase font-bold px-2 py-0.5 border-none shadow-none`}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-zinc-500">
                  {selectedOrder.tableNo ? `Table: ${selectedOrder.tableNo}` : "Takeaway"} • {selectedOrder.source}
                  {selectedOrder.guestName && ` • Guest: ${selectedOrder.guestName}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600" onClick={() => setSelectedOrder(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Panel Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Items */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex gap-3">
                        <span className="font-bold text-zinc-400">{item.qty}x</span>
                        <div>
                          <span className="font-bold text-zinc-800 block">{item.name}</span>
                          {item.options?.map((opt, i) => (
                            <span key={i} className="text-[10px] text-zinc-500 block italic">+ {opt}</span>
                          ))}
                        </div>
                      </div>
                      <span className="font-semibold text-zinc-900">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-zinc-100"></div>

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span>Subtotal</span>
                  <span>${(selectedOrder.subTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span>Tax</span>
                  <span>${(selectedOrder.taxTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-zinc-900 pt-2 border-t border-zinc-100 mt-2">
                  <span>Total</span>
                  <span>${(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

            </div>
          </>
        )}
      </div>

    </div>
  );
}
