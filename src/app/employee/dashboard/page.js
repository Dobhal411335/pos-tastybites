"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, ShoppingBag, Grid2X2, UtensilsCrossed, 
  BarChart3, UserCircle, LogOut, Clock, MapPin, Coffee, 
  CheckCircle2, Clock3, ChefHat, BellRing, ChevronRight, 
  Tablet, PhoneCall, Receipt, Wifi, ChevronLeft, Plus,
  AlertTriangle,
  Badge
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function EmployeeDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // New UI states
  const [currentTime, setCurrentTime] = useState(new Date());
  const [callManagerConfirm, setCallManagerConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/employee/dashboard");
        const json = await res.json();
        
        if (res.ok && json.success) {
          setData(json.data);
        } else {
          toast.error(json.message || "Failed to load dashboard");
          if (res.status === 401) router.push("/login");
        }
      } catch (err) {
        toast.error("Network error. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [router]);
  const handleCallManager = () => {
    if (!callManagerConfirm) {
      setCallManagerConfirm(true);
      setTimeout(() => setCallManagerConfirm(false), 3000); // Reset after 3s
    } else {
      toast.success("Manager notified.");
      setCallManagerConfirm(false);
    }
  };

  const handleTableClick = (tableStr) => {
    router.push(`/employee/orders/${tableStr}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 flex flex-col gap-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-75 rounded-xl lg:col-span-2" />
          <Skeleton className="h-75 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, shift, stats, tables, activeOrders } = data;

  return (
    <div className="flex h-screen bg-zinc-50 font-sans overflow-hidden">
      

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* SCROLLABLE DASHBOARD */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Hero Shift Card */}
          <div className="bg-orange-500 rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Good Shift, {profile?.firstName}</h2>
              <p className="text-orange-100 font-medium">Ready for service? Let&apos;s make it a great day.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-black/15 px-4 py-2.5 rounded-xl text-sm font-bold">
                <Clock className="w-4 h-4 text-orange-200" /> {shift?.isActive ? `${shift.startTime} - ${shift.endTime}` : "Off Shift"}
              </div>
              <div className="flex items-center gap-2 bg-black/15 px-4 py-2.5 rounded-xl text-sm font-bold">
                <MapPin className="w-4 h-4 text-orange-200" /> {shift?.section || 'Main Dining'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            <div className="lg:col-span-2 space-y-6">
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white">
                  <CardContent className="p-4 flex flex-col h-full cursor-pointer hover:bg-zinc-50 transition-colors">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Today&apos;s Orders</p>
                    <p className="text-3xl font-black text-zinc-900">{stats?.todayOrders || 0}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white">
                  <CardContent className="p-4 flex flex-col h-full cursor-pointer hover:bg-zinc-50 transition-colors">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Pending</p>
                    <p className="text-3xl font-black text-zinc-900">{stats?.pendingOrdersCount || 0}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white">
                  <CardContent className="p-4 flex flex-col h-full cursor-pointer hover:bg-zinc-50 transition-colors">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Completed</p>
                    <p className="text-3xl font-black text-zinc-900">{stats?.completedOrdersCount || 0}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-none shadow-sm bg-zinc-900 text-white cursor-pointer hover:bg-zinc-800 transition-colors">
                  <CardContent className="p-4 flex flex-col h-full">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Sales Today</p>
                    <p className="text-3xl font-black text-white">${stats?.totalSales || '0.00'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Assigned Tables */}
              <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">Assigned Tables</h3>
                    <p className="text-xs font-semibold text-zinc-500 mt-0.5">Ground Floor • Main Dining</p>
                  </div>
                </div>
                
                <div className="p-5">
                  {!tables || tables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-zinc-400 py-10">
                      <Grid2X2 className="w-10 h-10 mb-3 text-zinc-200" />
                      <p className="text-sm font-bold text-zinc-900">No tables assigned</p>
                      <p className="text-xs mt-1">See manager to assign sections.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {tables.map(table => {
                        const tableStr = typeof table === 'string' ? table : table.id || "TB-??";
                        const activeOrder = activeOrders?.find(o => o.table === tableStr);
                        
                        // Default: Available (Green)
                        let statusText = "Available";
                        let cardClass = "bg-green-50 border-green-200 hover:border-green-300";
                        let textClass = "text-green-700";
                        
                        if (activeOrder) {
                          if (activeOrder.status === 'Bill Requested') {
                            statusText = "Bill Requested";
                            cardClass = "bg-red-50 border-red-200 hover:border-red-300";
                            textClass = "text-red-700";
                          } else if (activeOrder.status === 'Reserved') {
                            statusText = "Reserved";
                            cardClass = "bg-blue-50 border-blue-200 hover:border-blue-300";
                            textClass = "text-blue-700";
                          } else {
                            // Occupied (Amber)
                            statusText = "Occupied";
                            cardClass = "bg-amber-50 border-amber-200 hover:border-amber-300";
                            textClass = "text-amber-700";
                          }
                        }

                        return (
                          <div 
                            key={tableStr} 
                            onClick={() => handleTableClick(tableStr)}
                            className={`aspect-square sm:aspect-auto sm:h-28 rounded-xl border p-4 cursor-pointer flex flex-col justify-between transition-colors shadow-sm ${cardClass}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-lg font-bold text-zinc-900">{tableStr}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-white/50 ${textClass}`}>{statusText}</span>
                            </div>
                            
                            <div>
                              {activeOrder ? (
                                <div className="flex justify-between items-end mt-2">
                                  <span className={`text-xs font-bold ${textClass} opacity-80`}>{activeOrder.timeElapsed || '0m'}</span>
                                  <span className="text-base font-black text-zinc-900">${activeOrder.total || '0.00'}</span>
                                </div>
                              ) : (
                                <div className="mt-2 text-[11px] font-bold text-green-700 opacity-60">Tap to start order</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* QUICK ACTIONS & ACTIVE ALERTS */}
            <div className="space-y-6">
              
              <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                 <div className="px-5 py-4 border-b border-zinc-100">
                  <h3 className="text-base font-bold text-zinc-900">Quick Actions</h3>
                </div>
                <div className="p-5 flex flex-col gap-3">               
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <Button variant="outline" className="h-12 rounded-xl border-zinc-200 font-bold text-sm text-zinc-700 shadow-none hover:bg-zinc-50" onClick={() => router.push('/employee/orders/history')}>
                       Today&apos;s Orders
                    </Button>
                    <Button variant="outline" className="h-12 rounded-xl border-zinc-200 font-bold text-sm text-zinc-700 shadow-none hover:bg-zinc-50" onClick={() => router.push('/employee/orders/active')}>
                       Open Orders
                    </Button>
                  </div>

                  <Button 
                    variant={callManagerConfirm ? "default" : "outline"}
                    className={`w-full h-12 rounded-xl font-bold text-sm shadow-none mt-1 transition-colors ${callManagerConfirm ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
                    onClick={handleCallManager}
                  >
                    {callManagerConfirm ? (
                      <>Confirm Call Manager</>
                    ) : (
                      <><PhoneCall className="w-4 h-4 mr-2 text-zinc-400" /> Call Manager</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Active Orders Summary (Optional, scaled down) */}
              {activeOrders && activeOrders.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-100 flex justify-between items-center">
                    <h3 className="text-base font-bold text-zinc-900">Active (<span className="text-orange-500">{activeOrders.length}</span>)</h3>
                    <span className="text-xs font-bold text-orange-600 cursor-pointer hover:underline">View All</span>
                  </div>
                  <div className="divide-y divide-zinc-100 max-h-75 overflow-y-auto">
                    {activeOrders.slice(0, 4).map(order => (
                      <div key={order.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 cursor-pointer" onClick={() => router.push(`/employee/orders/${order.id}`)}>
                        <div>
                          <p className="font-bold text-sm text-zinc-900">{order.table || 'Takeout'}</p>
                          <p className="text-xs font-semibold text-zinc-500 mt-0.5">{order.timeElapsed}</p>
                        </div>
                        <Badge variant="outline" className={`border-none px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase ${order.status === 'Cooking' || order.status === 'Preparing' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                          {order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
