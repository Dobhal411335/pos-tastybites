"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle, MoreHorizontal, ListOrdered, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

export default function TodayOrderListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders/admin");
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch (e) {
      toast.error("Failed to load today's orders");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, []);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [tableNo, setTableNo] = useState("");

  const handleConfirmClick = (order) => {
    setSelectedOrder(order);
    setIsConfirmModalOpen(true);
    setGuestName("");
    setCallNumber("");
    setTableNo("");
  };

  const handleFinalConfirm = async (e) => {
    e.preventDefault();
    if (selectedOrder) {
      try {
        const res = await fetch(`/api/orders/admin/${selectedOrder._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED", guestName, callNumber, tableNo })
        });
        const json = await res.json();
        if (json.success) {
          setOrders(orders.map(o => o._id === selectedOrder._id ? json.data : o));
          toast.success("Order confirmed!");
        } else {
          toast.error(json.message || "Failed to confirm order");
        }
      } catch (e) {
        toast.error("An error occurred");
      }
    }
    setIsConfirmModalOpen(false);
    setSelectedOrder(null);
  };

  const handleCancel = async (id) => {
    try {
      const res = await fetch(`/api/orders/admin/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      });
      const json = await res.json();
      if (json.success) {
        setOrders(orders.map(o => o._id === id ? json.data : o));
        toast.error("Order cancelled.");
      } else {
        toast.error(json.message || "Failed to cancel order");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/orders/admin/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setOrders(orders.filter(o => o._id !== id));
        toast.success("Order deleted.");
      } else {
        toast.error(json.message || "Failed to delete order");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden min-h-screen" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-300 mx-auto space-y-8 pb-16 font-sans">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                Today Order List
              </h1>
              <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                Manage and process incoming food orders for the day.
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
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Amount</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Status</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Process</TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-medium text-[14px]">
                        No orders for today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o._id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6">
                          <span className="font-bold text-[15px] text-zinc-900">{o.orderNumber}</span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <span className="font-bold text-[15px] text-zinc-700">${o.totalAmount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {o.status === "CONFIRMED" && (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1.5 text-[13px] font-semibold">
                              Confirmed
                            </Badge>
                          )}
                          {o.status === "CANCELLED" && (
                            <Badge className="bg-red-50 text-red-700 hover:bg-red-100 border-none px-3 py-1.5 text-[13px] font-semibold">
                              Cancelled
                            </Badge>
                          )}
                          {o.status === "PENDING" && (
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
                              disabled={o.status === 'CONFIRMED'}
                              onClick={() => handleConfirmClick(o)}
                              className={`h-8 px-3 text-[12px] font-bold ${o.status === 'CONFIRMED' ? 'opacity-50 cursor-not-allowed border-emerald-200 text-emerald-700 bg-emerald-50/50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={o.status === 'CANCELLED'}
                              onClick={() => handleCancel(o._id)}
                              className={`h-8 px-3 text-[12px] font-bold ${o.status === 'CANCELLED' ? 'opacity-50 cursor-not-allowed border-red-200 text-red-700 bg-red-50/50' : 'border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300'}`}
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
                                onClick={() => handleDelete(o._id)}
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

      {/* Final Confirm Modal for Admin */}
      {isConfirmModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-zinc-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden bg-white animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-4 relative">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <CardTitle className="text-[20px] font-bold text-zinc-900">Confirm Order</CardTitle>
              <CardDescription className="text-[14px]">Finalize details before sending to the kitchen.</CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-6">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Order ID</span>
                  <span className="font-bold text-[15px] text-zinc-900">{selectedOrder.orderNumber}</span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Date &amp; Time</span>
                  <span className="font-bold text-[14px] text-zinc-700">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <form onSubmit={handleFinalConfirm} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-zinc-700">Guest Name</label>
                    <Input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="bg-white border-zinc-200 h-11 text-[15px] focus:ring-2 focus:ring-[#1e40af]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-zinc-700">Call Number</label>
                    <Input
                      value={callNumber}
                      onChange={(e) => setCallNumber(e.target.value)}
                      placeholder="e.g. +1 234 567 8900"
                      className="bg-white border-zinc-200 h-11 text-[15px] focus:ring-2 focus:ring-[#1e40af]"
                    />
                  </div>
                </div>

                <div className="relative flex items-center py-2">
                  <div className="grow border-t border-black"></div>
                  <span className="shrink-0 mx-4 text-black text-[12px] font-semibold uppercase">Or Select Table</span>
                  <div className="grow border-t border-black"></div>
                </div>

                <div className="space-y-2">
                  <Select value={tableNo} onValueChange={setTableNo}>
                    <SelectTrigger className="w-full bg-white border-zinc-200 h-11 text-[15px] focus:ring-2 focus:ring-[#1e40af]">
                      <SelectValue placeholder="Assign a table..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60 overflow-y-auto">
                      <SelectItem value="T1">Table 1 (Window)</SelectItem>
                      <SelectItem value="T2">Table 2 (Center)</SelectItem>
                      <SelectItem value="T3">Table 3 (Patio)</SelectItem>
                      <SelectItem value="T4">Table 4 (VIP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="flex-1 h-12 font-bold text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-[#1e40af] hover:bg-blue-900 text-white font-bold text-[15px] shadow-md transition-transform hover:scale-[1.02]"
                  >
                    Confirm Order
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
