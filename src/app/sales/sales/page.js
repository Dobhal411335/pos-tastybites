"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown,Clock, DollarSign, ShoppingBag, 
  Receipt, Wallet, Search, ChevronDown, Calendar, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { toast } from "sonner";

// Mock Data for Charts (Keep static for now unless we have an aggregation endpoint)
const salesData = [
  { time: "9am", sales: 120 }, { time: "10am", sales: 250 },
  { time: "11am", sales: 400 }, { time: "12pm", sales: 850 },
  { time: "1pm", sales: 900 }, { time: "2pm", sales: 450 },
  { time: "3pm", sales: 300 }, { time: "4pm", sales: 500 },
];

const topItemsData = [
  { name: "Burger Combo", count: 45 },
  { name: "Margherita Pizza", count: 38 },
  { name: "Caesar Salad", count: 24 },
  { name: "Craft Beer", count: 20 },
  { name: "Pasta Alfredo", count: 18 },
];

const orderTypeData = [
  { name: "Dine-in", value: 65 },
  { name: "Takeaway", value: 25 },
  { name: "Delivery", value: 10 },
];
const COLORS = ["#f97316", "#3b82f6", "#10b981"]; // Orange, Blue, Green

export default function EmployeeSalesPage() {
  const [dateRange, setDateRange] = useState("Today");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      toast.error("Failed to fetch sales data.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "CONFIRMED": return "bg-emerald-100 text-emerald-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      case "PENDING": return "bg-amber-100 text-amber-700";
      default: return "bg-zinc-100 text-zinc-700";
    }
  };

  // Calculations
  const validOrders = orders.filter(o => o.status !== "CANCELLED");
  const totalOrders = validOrders.length;
  const totalSales = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? (totalSales / totalOrders) : 0;
  const tipsEarned = totalSales * 0.05; // Mock tips logic

  const stats = [
    { label: "Total Sales", value: `$${totalSales.toFixed(2)}`, icon: DollarSign, trend: "+0%", isUp: true },
    { label: "Total Orders", value: totalOrders.toString(), icon: ShoppingBag, trend: "+0%", isUp: true },
    { label: "Avg Order Value", value: `$${avgOrderValue.toFixed(2)}`, icon: Receipt, trend: "+0%", isUp: true },
    { label: "Tips Earned (Est.)", value: `$${tipsEarned.toFixed(2)}`, icon: Wallet, trend: "+0%", isUp: true },
  ];

  // Pagination logic
  const filteredOrders = orders.filter(o => 
    (o.orderNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (o.tableNo || "Takeaway").toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto pb-24 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Sales Report</h1>
          <p className="text-sm text-zinc-500 font-medium">Your performance overview.</p>
        </div>
        
        <div className="flex items-center bg-white rounded-xl p-1 border border-zinc-200 shadow-sm">
          {["Today", "This Week", "This Month"].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                dateRange === range 
                  ? 'bg-zinc-900 text-white shadow-sm' 
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* STATS ROW */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="rounded-2xl border-zinc-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className={`border-none font-bold text-xs ${
                    stat.isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    {stat.isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {stat.trend}
                  </Badge>
                </div>
                <p className="text-zinc-500 text-sm font-semibold">{stat.label}</p>
                <h3 className="text-2xl font-bold text-zinc-900">{stat.value}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Over Time (Line Chart) */}
        <Card className="rounded-2xl border-zinc-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 border-b border-zinc-100 mb-4">
            <CardTitle className="text-base font-bold text-zinc-800">Sales Over Time (Demo)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-70 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} dot={{r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Items & Order Type */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardHeader className="pb-2 border-b border-zinc-100 mb-2">
              <CardTitle className="text-base font-bold text-zinc-800">Top Items (Demo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-35 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topItemsData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#3f3f46', fontSize: 12, fontWeight: 500}} width={100} />
                    <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#e4e4e7" radius={[0, 4, 4, 0]}>
                      {topItemsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f97316' : '#e4e4e7'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardHeader className="pb-0 pt-4">
              <CardTitle className="text-base font-bold text-zinc-800 text-center">Order Split (Demo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-30 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={orderTypeData} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                      {orderTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {orderTypeData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ORDER HISTORY TABLE */}
      <Card className="rounded-2xl border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
          <h2 className="text-lg font-bold text-zinc-900">Recent Transactions</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              type="text" 
              placeholder="Search order ID or table..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-50 border-none rounded-xl h-10 focus-visible:ring-1 focus-visible:ring-orange-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Table / Guest</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-100">
                {currentOrders.map((order, i) => (
                  <tr key={order._id || i} className="hover:bg-zinc-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-zinc-900">{order.orderNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-zinc-700">
                      {order.tableNo || "Takeaway"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 font-medium">
                      {order.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-zinc-900">
                      ${(order.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Badge className={`${getStatusBadge(order.status)} border-none px-2.5 py-0.5 shadow-none font-bold uppercase text-[10px] tracking-wider`}>
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {currentOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-medium">
                      No matching orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50">
            <span className="text-sm font-medium text-zinc-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-lg bg-white border-zinc-200"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 text-zinc-600" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-lg bg-white border-zinc-200"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
