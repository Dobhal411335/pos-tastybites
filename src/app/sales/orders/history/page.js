"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, ChevronDown, Clock, CheckCircle2, ChevronRight, X, 
  Receipt, ShoppingBag, Truck, Check, ChefHat, Play, CheckCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const STATUSES = ["All", "PENDING", "CONFIRMED", "CANCELLED"];

export default function EmployeeOrdersHistory() {
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
      const res = await fetch("/api/orders/employee");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING": return "bg-amber-100 text-amber-700";
      case "CONFIRMED": return "bg-emerald-100 text-emerald-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-zinc-100 text-zinc-700";
    }
  };

  const getTypeIcon = (source, tableNo) => {
    if (source === 'ONLINE') return <ShoppingBag className="w-4 h-4 text-zinc-400" />;
    return <Receipt className="w-4 h-4 text-zinc-400" />;
  };

  const filteredOrders = orders.filter(o => {
    const matchesTab = activeTab === "All" || o.status === activeTab;
    const searchString = `${o.orderNumber || ''} ${o.tableNo || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-50 font-sans h-[calc(100vh-64px)]">
      
      {/* MAIN LIST AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedOrder ? 'pr-100 xl:pr-[450px]' : ''}`}>
        
        {/* HEADER & FILTERS */}
        <div className="bg-white p-6 border-b border-zinc-200 shrink-0 shadow-sm z-10">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
              <p className="text-sm text-zinc-500 font-medium mt-1">Manage and track all current orders.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  placeholder="Search ID or Table..." 
                  className="pl-9 w-full md:w-64 bg-zinc-50 border-none rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-orange-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-11 rounded-xl bg-white text-zinc-600 font-bold border-zinc-200">
                Today <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
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
                <h3 className="text-lg font-bold text-zinc-900">No orders found</h3>
                <p className="text-zinc-500 text-sm mt-1">Try changing your filters or start a new order.</p>
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
        className={`fixed top-16 bottom-0 right-0 w-[400px] xl:w-[450px] bg-white border-l border-zinc-200 shadow-2xl transition-transform duration-300 z-30 flex flex-col ${
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
                <p className="text-sm font-semibold text-zinc-500">{selectedOrder.tableNo || "Takeaway"} • {selectedOrder.source}</p>
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
                        <span className="font-bold text-zinc-800">{item.name}</span>
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

              <div className="h-px bg-zinc-100"></div>

              {/* Status Stepper */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Timeline</h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-zinc-100">
                  
                  {/* Simplistic mock stepper for visuals */}
                  {["Sent to Kitchen", "Preparing", "Ready", "Served"].map((step, idx) => {
                    const isDone = idx < 2; // Mock state
                    const isActive = idx === 2;
                    return (
                      <div key={step} className="relative flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-white ${
                          isDone ? 'border-emerald-500 text-emerald-500' : isActive ? 'border-orange-500 text-orange-500' : 'border-zinc-300 text-transparent'
                        }`}>
                          {isDone ? <Check className="w-3.5 h-3.5" /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-orange-500' : 'bg-transparent'}`}></div>}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${isDone || isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>{step}</p>
                          {isDone && <p className="text-xs font-semibold text-zinc-400 uppercase">2:3{idx} PM</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Action Footer */}
            <div className="p-5 border-t border-zinc-200 bg-zinc-50 shrink-0">
              {selectedOrder.status === "Ready" && (
                <Button className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-none">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Mark as Served
                </Button>
              )}
              {selectedOrder.status === "Served" && (
                <Button className="w-full h-12 text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-none">
                  Collect Payment
                </Button>
              )}
              {["Draft", "Pending", "Kitchen", "Preparing"].includes(selectedOrder.status) && (
                <Button variant="outline" className="w-full h-12 text-base font-bold text-zinc-400 border-zinc-200 rounded-xl" disabled>
                  Waiting on Kitchen...
                </Button>
              )}
               {selectedOrder.status === "Paid" && (
                <Button variant="outline" className="w-full h-12 text-base font-bold text-zinc-400 border-zinc-200 rounded-xl" disabled>
                  Order Complete
                </Button>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
