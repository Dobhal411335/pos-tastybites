"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  UserCircle, LogOut, Clock, MapPin, Coffee, CheckCircle2, 
  Clock3, ChefHat, BellRing, ChevronRight
} from "lucide-react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Mock Data
const MOCK_EMPLOYEE = {
  firstName: "Sarah",
  lastName: "Jenkins",
  role: "Server",
  shift: {
    startTime: "08:00 AM",
    endTime: "04:00 PM",
    floor: "Main Dining",
    section: "Window Seats"
  },
  tables: ["T1", "T2", "T4", "T7"],
  stats: {
    todayOrders: 24,
    pendingOrders: 3,
    completedOrders: 21,
    tipsEarned: 145.50
  }
};

const MOCK_ACTIVE_ORDERS = [
  { id: "ORD-801", table: "T2", items: 3, timeElapsed: "12 mins", status: "Cooking" },
  { id: "ORD-804", table: "T7", items: 1, timeElapsed: "4 mins", status: "Pending" },
  { id: "ORD-805", table: "T1", items: 4, timeElapsed: "1 min", status: "Pending" }
];

export default function EmployeeDashboard() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const loadData = () => {
      setTimeout(() => {
        setEmployee(MOCK_EMPLOYEE);
        setOrders(MOCK_ACTIVE_ORDERS);
        setIsLoading(false);
      }, 600);
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/employee/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Successfully clocked out.");
        router.push("/employee/login");
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
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

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <Toaster richColors />

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
                <p className="text-sm font-bold text-zinc-900">{employee.firstName} {employee.lastName}</p>
                <p className="text-xs font-medium text-zinc-500">{employee.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {employee.firstName[0]}{employee.lastName[0]}
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
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-4 uppercase tracking-widest text-[10px]">Active Shift</Badge>
                <h2 className="text-3xl sm:text-4xl font-black mb-2 drop-shadow-sm">Good shift, {employee.firstName}!</h2>
                <p className="text-orange-100 font-medium text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" /> {employee.shift.startTime} - {employee.shift.endTime}
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center min-w-[200px]">
                <p className="text-orange-100 font-semibold uppercase text-xs tracking-wider mb-1">Your Station</p>
                <p className="text-2xl font-black">{employee.shift.floor}</p>
                <p className="text-sm font-medium mt-1">{employee.shift.section}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Stats Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-zinc-200 shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900">{employee.stats.todayOrders}</p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mt-1">Total Orders</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200 shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                    <Clock3 className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900">{employee.stats.pendingOrders}</p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mt-1">Pending</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200 shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-zinc-900">{employee.stats.completedOrders}</p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mt-1">Completed</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200 shadow-sm bg-zinc-900 text-white">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-white/10 text-emerald-400 flex items-center justify-center mb-3">
                    <span className="font-bold text-lg">$</span>
                  </div>
                  <p className="text-3xl font-black">${employee.stats.tipsEarned}</p>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mt-1">Est. Tips</p>
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
                <div className="divide-y divide-zinc-100">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 px-6 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex flex-col items-center justify-center text-orange-700">
                          <span className="text-xs font-bold uppercase tracking-tighter">Tbl</span>
                          <span className="font-black leading-none">{order.table.replace('T', '')}</span>
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
              </CardContent>
            </Card>

          </div>

          {/* Right Sidebar - Assigned Tables */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white h-full">
              <CardHeader className="px-6 py-5 border-b border-zinc-100">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" /> My Tables
                </CardTitle>
                <CardDescription>Tables currently in your section</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {employee.tables.map(table => (
                    <div key={table} className="aspect-square bg-zinc-50 rounded-2xl border-2 border-zinc-100 hover:border-blue-200 hover:bg-blue-50 transition-all flex flex-col items-center justify-center cursor-pointer group shadow-sm">
                      <span className="text-3xl font-black text-zinc-700 group-hover:text-blue-700 transition-colors">{table}</span>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Ready</span>
                    </div>
                  ))}
                </div>
                
                <Button className="w-full mt-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-12 rounded-xl">
                  New Order
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
