"use client";

import React, { useState } from "react";
import { Edit, Trash2, ListOrdered, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function EmployeeConfirmOrdersPage() {
  const [orders, setOrders] = useState([
    { id: 3, orderNumber: "ORD-091", guestName: "Sarah Smith", amount: 104.99, status: "confirmed", time: "01:15 PM" },
    { id: 4, orderNumber: "ORD-092", tableNo: "Table 2", amount: 89.00, status: "confirmed", time: "02:30 PM" },
    { id: 5, orderNumber: "ORD-093", guestName: "Mike Johnson", amount: 55.50, status: "confirmed", time: "03:45 PM" },
  ]);

  const handleDelete = (id) => {
    setOrders(orders.filter(o => o.id !== id));
    toast.success("Order record deleted.");
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Confirmed Orders
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                View all orders that have been successfully confirmed.
              </p>
            </div>
          </div>

          {/* Orders Table */}
          <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-[#1e40af]" />
                <CardTitle className="text-[18px] font-bold text-zinc-900">Confirmed Order History</CardTitle>
              </div>
              <div className="text-[13px] font-semibold text-zinc-500 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                All Time
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
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                        No confirmed orders found.
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
                          <Badge className="bg-emerald-50 text-emerald-700 border-none px-3 py-1.5 text-[13px] font-semibold">
                            Confirmed
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(o.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
