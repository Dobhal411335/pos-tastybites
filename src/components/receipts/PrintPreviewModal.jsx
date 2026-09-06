import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CustomerReceipt from './CustomerReceipt';
import KitchenOrderTicket from './KitchenOrderTicket';
import BarReceipt from './BarReceipt';

const PREVIEW_TITLES = {
  customer: 'Customer Receipt Preview',
  kot: 'Kitchen Order Ticket (KOT)',
  bar: 'Bar Receipt',
};

const PrintPreviewModal = ({ 
  isOpen, 
  onClose, 
  printType, // 'customer' | 'kot' | 'bar'
  order, 
  kotItems = [], 
  taxBreakdown = [],
  restaurantDetails = null,
  serverName,
  guestCount,
  specialNote,
}) => {
  const [reprinting, setReprinting] = useState(false);
  const [isReprint, setIsReprint] = useState(Boolean(order?.isReprint));

  if (!isOpen || !order) return null;

  const handleReprint = async () => {
    const orderId = order?._id || order?.id;
    if (!orderId) {
      toast.error('No saved order found to reprint.');
      return;
    }

    setReprinting(true);
    try {
      const res = await fetch('/api/sales/print-jobs/reprint-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: String(orderId),
          printType,
          kotItems,
          guestCount,
          serverName,
          specialNote,
          restaurantName: restaurantDetails?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to send print job');
      }
      setIsReprint(true);
      toast.success(
        printType === 'customer'
          ? 'Receipt queued to printer!'
          : printType === 'bar'
            ? 'Bar ticket queued to printer!'
            : 'KOT queued to printer!'
      );
    } catch (err) {
      toast.error(err.message || 'Failed to reprint ticket');
    } finally {
      setReprinting(false);
    }
  };

  const reprintButtonLabel = (() => {
    if (reprinting) return 'Sending to Printer...';
    if (printType === 'customer') return 'Reprint Receipt';
    if (printType === 'bar') return 'Reprint Bar Ticket';
    return 'Reprint KOT';
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-100 max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-white shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-500" />
            {PREVIEW_TITLES[printType] || 'Print Preview'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start bg-zinc-100">
          {/* Safe visual wrapper for the preview (styled like paper) */}
          <div className="shadow-lg bg-white rounded-sm overflow-hidden" style={{ width: '80mm' }}>
            {printType === 'customer' && (
              <CustomerReceipt 
                order={order} 
                taxBreakdown={taxBreakdown} 
                restaurantDetails={restaurantDetails} 
                serverName={serverName}
                guestCount={guestCount}
                isReprint={isReprint}
              />
            )}
            {printType === 'kot' && (
              <KitchenOrderTicket 
                order={order} 
                kotItems={kotItems} 
                restaurantName={restaurantDetails?.name}
                serverName={serverName}
                guestCount={guestCount}
                specialNote={specialNote}
                isReprint={isReprint}
              />
            )}
            {printType === 'bar' && (
              <BarReceipt
                order={order}
                barItems={kotItems}
                restaurantName={restaurantDetails?.name}
                serverName={serverName}
                guestCount={guestCount}
                specialNote={specialNote}
                isReprint={isReprint}
              />
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-white border-t shrink-0 flex sm:justify-between w-full gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={reprinting}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            onClick={handleReprint}
            disabled={reprinting}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-none font-bold gap-2"
          >
            {reprinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            {reprintButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintPreviewModal;
