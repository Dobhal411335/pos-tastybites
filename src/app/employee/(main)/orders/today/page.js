"use client";

import React, { useState } from "react";
import { Edit, Trash2, CheckCircle, XCircle, MoreHorizontal, ListOrdered, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function EmployeeTodayOrderListPage() {
  const [orders, setOrders] = useState([
    { id: 1, orderNumber: "ORD-089", guestName: "John Doe", amount: 45.20, status: "pending", time: "12:30 PM" },
    { id: 2, orderNumber: "ORD-090", tableNo: "Table 4", amount: 12.50, status: "pending", time: "12:45 PM" },
    { id: 3, orderNumber: "ORD-091", guestName: "Sarah Smith", amount: 104.99, status: "confirmed", time: "01:15 PM" },
  ]);

  const handleConfirm = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "confirmed" } : o));
    toast.success("Order confirmed!");
  };

  const handleCancel = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
    toast.error("Order cancelled.");
  };

  const handleDelete = (id) => {
    setOrders(orders.filter(o => o.id !== id));
    toast.success("Order deleted.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Today&apos;s Orders
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Manage and update status for all orders placed today.
              </p>
            </div>
          </div>

          {/* Orders Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-[#1e40af]" />
                <CardTitle className="text-[18px] font-bold text-zinc-900">Live Orders</CardTitle>
              </div>
              <div className="text-[13px] font-semibold text-zinc-500 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Current Date Status
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Order Number</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Customer / Table</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">Time</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Amount</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Process</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                        No orders have been placed today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <span className="font-bold text-[15px] text-zinc-900">{o.orderNumber}</span>
                        </TableCell>
                        <TableCell className="px-6">
                          <span className="font-medium text-[14px] text-zinc-700">{o.guestName || o.tableNo || "N/A"}</span>
                        </TableCell>
                        <TableCell className="px-6">
                          <span className="font-medium text-[13px] text-zinc-500">{o.time}</span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="font-bold text-[15px] text-zinc-700">${o.amount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {o.status === "confirmed" && (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1.5 text-[13px] font-semibold">
                              Confirmed
                            </Badge>
                          )}
                          {o.status === "cancelled" && (
                            <Badge className="bg-red-50 text-red-700 hover:bg-red-100 border-none px-3 py-1.5 text-[13px] font-semibold">
                              Cancelled
                            </Badge>
                          )}
                          {o.status === "pending" && (
                            <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-none px-3 py-1.5 text-[13px] font-semibold">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={o.status === 'confirmed'}
                              onClick={() => handleConfirm(o.id)}
                              className={`h-8 px-3 text-[12px] font-bold ${o.status === 'confirmed' ? 'opacity-50 cursor-not-allowed border-emerald-200 text-emerald-700 bg-emerald-50/50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={o.status === 'cancelled'}
                              onClick={() => handleCancel(o.id)}
                              className={`h-8 px-3 text-[12px] font-bold ${o.status === 'cancelled' ? 'opacity-50 cursor-not-allowed border-red-200 text-red-700 bg-red-50/50' : 'border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300'}`}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 border text-zinc-500 hover:text-zinc-900 cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white">
                              <DropdownMenuItem className="text-[14px] font-medium cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Order
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => handleDelete(o.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
