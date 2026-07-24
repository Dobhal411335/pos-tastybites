"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  UserCircle, LogOut, Clock, MapPin, Coffee, CheckCircle2, 
  Clock3, ChefHat, BellRing, ChevronRight, Plus
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter 
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmployeeDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sheet State
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [orderType, setOrderType] = useState("dine-in");
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

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

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/employee/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Successfully clocked out.");
        router.push("/login");
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const handleStartOrder = () => {
    if (orderType === "dine-in" && !selectedTable) {
      toast.error("Please select a table first.");
      return;
    }
    if (orderType === "takeaway" && (!guestName.trim() || !guestPhone.trim())) {
      toast.error("Guest Name and Phone are required for Takeaway.");
      return;
    }

    // Build URL params
    const params = new URLSearchParams();
    params.set("type", orderType);
    if (orderType === "dine-in") params.set("table", selectedTable);
    if (orderType === "takeaway") {
      params.set("name", guestName);
      params.set("phone", guestPhone);
    }

    setIsNewOrderOpen(false);
    // Route to actual ordering screen (we will create this later)
    router.push(`/employee/orders/new?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 flex flex-col gap-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[300px] rounded-2xl lg:col-span-2" />
          <Skeleton className="h-[300px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, shift, stats, tables, activeOrders } = data;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
              <ChefHat className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Staff Portal</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-zinc-500 hover:text-zinc-900">
              <BellRing className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            
            <div className="hidden sm:flex items-center gap-3 border-l border-zinc-200 pl-4">
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900">{profile.firstName} {profile.lastName}</p>
                <p className="text-xs font-medium text-zinc-500">{profile.role}</p>
              </div>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                style={{ backgroundColor: profile.color }}
              >
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
            </div>

            <Button 
              variant="outline" 
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold ml-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2 hidden sm:block" />
              <span className="hidden sm:inline">Clock Out</span>
              <LogOut className="w-4 h-4 sm:hidden" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Welcome & Shift Card */}
        <Card className="bg-linear-to-r from-orange-600 to-orange-500 border-none rounded-3xl text-white overflow-hidden shadow-lg shadow-orange-600/20">
          <CardContent className="p-8 sm:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                {shift.isActive ? (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-4 uppercase tracking-widest text-[10px]">Active Shift</Badge>
                ) : (
                  <Badge className="bg-zinc-800/50 hover:bg-zinc-800/60 text-white border-none mb-4 uppercase tracking-widest text-[10px]">No Active Shift</Badge>
                )}
                <h2 className="text-3xl sm:text-4xl font-black mb-2 drop-shadow-sm">Good shift, {profile.firstName}!</h2>
                {shift.isActive ? (
                  <p className="text-orange-100 font-medium text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" /> {shift.startTime} - {shift.endTime}
                  </p>
                ) : (
                  <p className="text-orange-100 font-medium text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" /> You are currently off shift
                  </p>
                )}
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center min-w-[200px]">
                <p className="text-orange-100 font-semibold uppercase text-xs tracking-wider mb-1">Your Station</p>
                <p className="text-2xl font-black">{shift.floor}</p>
                <p className="text-sm font-medium mt-1">{shift.section}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Stats Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900">{stats.todayOrders}</p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mt-1">Total Orders</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                    <Clock3 className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900">{stats.pendingOrdersCount}</p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mt-1">Pending</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900">{stats.completedOrdersCount}</p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mt-1">Completed</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200 shadow-sm bg-zinc-900 text-white hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-white/10 text-emerald-400 flex items-center justify-center mb-3">
                    <span className="font-bold text-lg">$</span>
                  </div>
                  <p className="text-3xl font-black">${stats.totalSales}</p>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mt-1">Sales Today</p>
                </CardContent>
              </Card>
            </div>

            {/* Active Orders List */}
            <Card className="rounded-3xl border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="px-6 py-5 border-b border-zinc-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Your Active Orders</CardTitle>
                  <CardDescription>Track the status of tickets for your tables</CardDescription>
                </div>
                <Button variant="outline" className="h-8 text-xs font-semibold">View All</Button>
              </CardHeader>
              <CardContent className="p-0">
                {activeOrders.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400 font-medium">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-zinc-200" />
                    No active orders at the moment.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {activeOrders.map((order) => (
                      <div key={order.id} className="p-4 px-6 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-orange-100 flex flex-col items-center justify-center text-orange-700">
                            <span className="text-xs font-bold uppercase tracking-tighter">Tbl</span>
                            <span className="font-black leading-none">{order.table?.replace('T', '') || '-'}</span>
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900">{order.id} <span className="text-zinc-400 font-normal ml-2">• {order.items} items</span></p>
                            <p className="text-sm font-medium text-red-500 flex items-center gap-1 mt-0.5">
                              <Clock3 className="w-3.5 h-3.5" /> {order.timeElapsed} waiting
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Badge className={`${order.status === 'Cooking' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'} border-none shadow-none`}>
                            {order.status}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-orange-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Sidebar - Assigned Tables */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white h-full flex flex-col">
              <CardHeader className="px-6 py-5 border-b border-zinc-100">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" /> My Tables
                </CardTitle>
                <CardDescription>Tables currently in your section</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col">
                {tables.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm font-medium text-center">
                    You have no assigned tables right now.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {tables.map(table => (
                      <div key={table} className="aspect-square bg-zinc-50 rounded-2xl border-2 border-zinc-100 hover:border-blue-200 hover:bg-blue-50 transition-all flex flex-col items-center justify-center cursor-pointer group shadow-sm">
                        <span className="text-3xl font-black text-zinc-700 group-hover:text-blue-700 transition-colors">{table}</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Ready</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button 
                  onClick={() => setIsNewOrderOpen(true)}
                  className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold h-14 rounded-xl text-lg shadow-lg shadow-orange-600/30 gap-2"
                >
                  <Plus className="w-6 h-6" />
                  New Order
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>

      {/* NEW ORDER SLIDE-OUT DRAWER */}
      <Sheet open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <SheetContent className="bg-white border-l-0 shadow-2xl sm:max-w-md w-full p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-zinc-100">
            <SheetTitle className="text-2xl font-black">Start New Order</SheetTitle>
            <SheetDescription>
              Select order type and basic details before proceeding to the menu.
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={orderType} onValueChange={setOrderType} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-100 p-1 rounded-xl h-12">
                <TabsTrigger value="dine-in" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                  Dine-In Table
                </TabsTrigger>
                <TabsTrigger value="takeaway" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                  Takeaway
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="dine-in" className="space-y-4 outline-none">
                <div className="mb-4">
                  <Label className="text-sm font-bold text-zinc-700 mb-2 block">Select Table</Label>
                  {tables.length === 0 ? (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                      You don't have any tables assigned. Please check with your manager or use Takeaway.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {tables.map(table => (
                        <div 
                          key={table}
                          onClick={() => setSelectedTable(table)}
                          className={`
                            h-20 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all
                            ${selectedTable === table 
                              ? 'border-orange-500 bg-orange-50 text-orange-700' 
                              : 'border-zinc-200 bg-white hover:border-orange-200 hover:bg-orange-50/50'}
                          `}
                        >
                          <span className="font-black text-xl">{table}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="takeaway" className="space-y-6 outline-none">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-zinc-700">Guest Name</Label>
                  <Input 
                    placeholder="e.g. John Doe" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="h-12 bg-zinc-50 border-zinc-200 focus-visible:ring-orange-500 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-zinc-700">Phone Number (Optional)</Label>
                  <Input 
                    placeholder="e.g. +1 234 567 8900" 
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="h-12 bg-zinc-50 border-zinc-200 focus-visible:ring-orange-500 rounded-xl"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <SheetFooter className="p-6 border-t border-zinc-100 bg-zinc-50/50">
            <Button 
              onClick={handleStartOrder}
              className="w-full h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-lg"
            >
              Proceed to Menu <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
