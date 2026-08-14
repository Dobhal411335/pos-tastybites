"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Loader2, Search, Eye, History, CreditCard, User, Gift } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";

export default function GiftcardDetailsPage() {
  const [fetching, setFetching] = useState(true);
  const [giftcards, setGiftcards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);

  const fetchGiftcards = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/menu/giftcards?view=flat&limit=100");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGiftcards(data.data.giftcards || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch giftcards", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchGiftcards();
  }, []);

  const filteredGiftcards = useMemo(() => {
    return giftcards.filter((gc) => {
      const search = searchTerm.toLowerCase();
      const codeMatch = gc.code?.toLowerCase().includes(search);
      const nameMatch = gc.recipientName?.toLowerCase().includes(search);
      const emailMatch = gc.recipientEmail?.toLowerCase().includes(search);
      return codeMatch || nameMatch || emailMatch;
    });
  }, [giftcards, searchTerm]);

  const openOrderReceipt = async (orderId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!orderId || receiptLoadingId) return;

    try {
      setReceiptLoadingId(String(orderId));
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (!json.success || !json.data) {
        toast.error(json.message || "Order not found");
        return;
      }
      setReceiptOrder(json.data);
      setReceiptOpen(true);
    } catch (err) {
      console.error("Failed to fetch order", err);
      toast.error("Failed to load order receipt");
    } finally {
      setReceiptLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Giftcard Details</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all issued giftcards, their balances, and usage history.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm p-6 space-y-6">
        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by code, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-gray-50 border-gray-200 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="rounded-md border border-gray-200">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Giftcard No</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Initial Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetching ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <span className="text-gray-500">Loading giftcards...</span>
                  </TableCell>
                </TableRow>
              ) : filteredGiftcards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                    No issued giftcards found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGiftcards.map((gc, index) => (
                  <TableRow key={gc._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="font-mono">{gc.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{gc.recipientName}</div>
                      <div className="text-xs text-gray-500">{gc.recipientEmail}</div>
                    </TableCell>
                    <TableCell>${gc.value?.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${gc.balance > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        ${(gc.balance ?? gc.value)?.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-175 bg-white">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                              <Gift className="h-5 w-5 text-blue-600" />
                              Giftcard Details
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6 pt-4">
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Giftcard Number</p>
                                <p className="font-mono font-medium text-gray-900">{gc.code}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Status</p>
                                <p className={`font-medium ${gc.balance > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                  {gc.balance > 0 ? 'Active' : 'Depleted'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Recipient Info</p>
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{gc.recipientName}</p>
                                    <p className="text-sm text-gray-500">{gc.recipientEmail}</p>
                                    <p className="text-sm text-gray-500">{gc.recipientPhone}</p>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Value Summary</p>
                                <p className="text-sm"><span className="text-gray-500">Initial:</span> ${gc.value?.toFixed(2)}</p>
                                <p className="text-sm font-semibold"><span className="text-gray-500 font-normal">Balance:</span> ${(gc.balance ?? gc.value)?.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-1">Issued: {gc.issueDate ? format(new Date(gc.issueDate), "MMM d, yyyy") : 'N/A'}</p>
                              </div>
                            </div>

                            {/* History Section */}
                            <div>
                              <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3 border-b pb-2">
                                <History className="h-4 w-4" />
                                Usage History
                              </h4>
                              {(!gc.history || gc.history.length === 0) ? (
                                <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                  No usage history found for this giftcard.
                                </p>
                              ) : (
                                <div className="rounded-md border border-gray-200 overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-gray-50">
                                      <TableRow>
                                        <TableHead className="w-[120px]">Date</TableHead>
                                        <TableHead>Amount Used</TableHead>
                                        <TableHead>Balance After</TableHead>
                                        <TableHead>Ref / Note</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {gc.history.map((h, i) => (
                                        <TableRow key={i}>
                                          <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                            {format(new Date(h.usedAt), "MMM d, yyyy HH:mm")}
                                          </TableCell>
                                          <TableCell className="font-medium text-red-600">
                                            -${h.amountUsed?.toFixed(2)}
                                          </TableCell>
                                          <TableCell className="font-medium text-gray-900">
                                            ${h.balanceAfter?.toFixed(2)}
                                          </TableCell>
                                          <TableCell className="text-xs text-gray-500">
                                            {h.orderId ? (
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="whitespace-nowrap">Order #{h.orderId}</span>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 px-2 gap-1 shrink-0 bg-blue-500 text-white hover:bg-blue-600"
                                                  title="View order bill"
                                                  disabled={receiptLoadingId === String(h.orderId)}
                                                  onClick={(e) => openOrderReceipt(h.orderId, e)}
                                                >
                                                  {receiptLoadingId === String(h.orderId) ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                  ) : (
                                                    <Eye className="h-3.5 w-3.5" />
                                                  )}
                                                  View Bill
                                                </Button>
                                              </div>
                                            ) : (
                                              h.note || "—"
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PrintPreviewModal
        isOpen={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptOrder(null);
        }}
        printType="customer"
        order={receiptOrder}
        taxBreakdown={receiptOrder?.taxBreakdown || []}
        restaurantDetails={receiptOrder?.restaurantDetails || null}
        serverName={receiptOrder?.processedByName || "Server"}
        guestCount={receiptOrder?.guestCount}
      />
    </div>
  );
}
