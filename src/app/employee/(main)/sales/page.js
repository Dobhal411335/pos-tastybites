"use client";

import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Filter, Download, BarChart3, TrendingUp, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PALETTE } from "@/utils/paletteeColor";

export default function EmployeeSalesRecordPage() {
  const [timeRange, setTimeRange] = useState("week");

  const chartData = [
    { name: "Mon", sales: 400 },
    { name: "Tue", sales: 300 },
    { name: "Wed", sales: 550 },
    { name: "Thu", sales: 200 },
    { name: "Fri", sales: 700 },
    { name: "Sat", sales: 900 },
    { name: "Sun", sales: 850 },
  ];

  const salesRecords = [
    { id: 1, orderId: "ORD-089", date: "2026-07-19", time: "12:30 PM", amount: 45.20, paymentMethod: "Credit Card", status: "completed" },
    { id: 2, orderId: "ORD-090", date: "2026-07-19", time: "12:45 PM", amount: 12.50, paymentMethod: "Cash", status: "completed" },
    { id: 3, orderId: "ORD-091", date: "2026-07-19", time: "01:15 PM", amount: 104.99, paymentMethod: "Credit Card", status: "completed" },
    { id: 4, orderId: "ORD-092", date: "2026-07-18", time: "06:30 PM", amount: 89.00, paymentMethod: "Debit Card", status: "completed" },
    { id: 5, orderId: "ORD-093", date: "2026-07-18", time: "08:15 PM", amount: 150.50, paymentMethod: "Credit Card", status: "completed" },
  ];

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Total Sales Record
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Track and analyze your overall sales performance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-10 px-4 font-semibold text-[15px] gap-2 hover:bg-zinc-50 border-zinc-200 text-zinc-700">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Filters & KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm border-zinc-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-[14px] font-bold text-zinc-500 uppercase tracking-wider">Total Sales</p>
                    <h3 className="text-[28px] font-black text-zinc-900">$3,942.50</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[13px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-md">
                  +12.5% from last week
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-zinc-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-[14px] font-bold text-zinc-500 uppercase tracking-wider">Total Orders</p>
                    <h3 className="text-[28px] font-black text-zinc-900">124</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-[#1e40af]" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[13px] font-bold text-zinc-500">
                  Across all channels
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-zinc-200 bg-white flex flex-col justify-center">
              <CardContent className="p-6 space-y-4">
                <label className="text-[14px] font-bold text-zinc-700 block">Time Period</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full h-12 text-[15px] border-zinc-200 focus:ring-2 focus:ring-[#1e40af] bg-zinc-50 font-medium">
                    <SelectValue placeholder="Select Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Chart Section */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[18px] font-bold text-zinc-900">Sales Overview</CardTitle>
                <CardDescription className="text-[13px] mt-1">Revenue trends over the selected period.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 h-100">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e40af" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 13, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 13, fontWeight: 600 }} tickFormatter={(val) => `$${val}`} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    itemStyle={{ color: '#1e40af' }}
                    formatter={(value) => [`$${value}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#1e40af" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Filter Bar for Table */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-zinc-400" />
              <span className="font-bold text-[15px] text-zinc-700">Filter Records</span>
            </div>
            <div className="flex gap-3">
              <Select defaultValue="all">
                <SelectTrigger className="h-40 h-10 border-zinc-200">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
              <Button className="h-10 bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-6">Apply</Button>
            </div>
          </div>

          {/* Data Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
              <CardTitle className="text-[18px] font-bold text-zinc-900">Detailed Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Order ID</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Date & Time</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Amount</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Payment Method</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRecords.map((record) => (
                    <TableRow key={record.id} className="h-16 hover:bg-zinc-50 transition-colors">
                      <TableCell className="px-6">
                        <span className="font-bold text-[15px] text-zinc-900">{record.orderId}</span>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="font-medium text-[14px] text-zinc-900">{record.date}</div>
                        <div className="text-[13px] text-zinc-500">{record.time}</div>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <span className="font-bold text-[15px] text-[#F97316]">${record.amount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-600 text-[12px] font-bold">
                          {record.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1.5 text-[13px] font-semibold capitalize">
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
