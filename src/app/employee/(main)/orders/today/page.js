"use client";

import React, { useState } from "react";
import { Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function EmployeeTodayOrderListPage() {
  const [orders, setOrders] = useState([
    { id: 1, orderNumber: "ORD-089", guestName: "John Doe", amount: 45.20, status: "pending", time: "12:30 PM" },
    { id: 2, orderNumber: "ORD-090", tableNo: "Table 4", amount: 12.50, status: "pending", time: "12:45 PM" },
    { id: 3, orderNumber: "ORD-091", guestName: "Sarah Smith", amount: 104.99, status: "confirmed", time: "01:15 PM" },
  ]);

  const handleConfirm = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "confirmed" } : o));
    toast.success("Order confirmed successfully!");
  };

  const handleCancel = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
    toast.error("Order marked as cancelled.");
  };

  const handleDelete = (id) => {
    setOrders(orders.filter(o => o.id !== id));
    toast.success("Order deleted.");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-200">Confirmed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 border border-red-200">Cancelled</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600 border border-orange-200">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Today&apos;s Orders</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and update status for all orders placed today</p>
        </div>
      </div>

      <div className="bg-white rounded-[14px] shadow-sm border border-zinc-200 overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4">
          <h2 className="font-semibold text-zinc-800">Order List</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-white text-zinc-500 border-b border-zinc-100">
                <th className="px-6 py-4 font-medium">Order Number</th>
                <th className="px-6 py-4 font-medium">Customer / Table</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-center">Manage</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                    No orders have been placed today.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">{o.orderNumber}</td>
                    <td className="px-6 py-4 text-zinc-600">{o.guestName || o.tableNo || "N/A"}</td>
                    <td className="px-6 py-4 text-zinc-600">{o.time}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900">${o.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">{getStatusBadge(o.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleConfirm(o.id)}
                          disabled={o.status === 'confirmed'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            o.status === 'confirmed' 
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Confirm
                        </button>
                        <button 
                          onClick={() => handleCancel(o.id)}
                          disabled={o.status === 'cancelled'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            o.status === 'cancelled' 
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                            : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                          }`}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
