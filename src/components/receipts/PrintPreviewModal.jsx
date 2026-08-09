import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import CustomerReceipt from './CustomerReceipt';
import KitchenOrderTicket from './KitchenOrderTicket';

const PrintPreviewModal = ({ 
  isOpen, 
  onClose, 
  printType, // 'customer' or 'kot'
  order, 
  kotItems = [], 
  taxBreakdown = [],
  restaurantDetails = null,
  serverName,
  guestCount,
  specialNote,
}) => {
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !order) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-zinc-100 max-h-[90vh] flex flex-col p-0 overflow-hidden hide-in-print">
          <DialogHeader className="p-4 border-b bg-white shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Printer className="w-5 h-5" />
              {printType === 'customer' ? 'Customer Receipt Preview' : 'Kitchen Order Ticket (KOT)'}
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
                />
              )}
            </div>
          </div>

          <DialogFooter className="p-4 bg-white border-t shrink-0 flex sm:justify-between w-full gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button onClick={handlePrint} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-none font-bold gap-2">
              <Printer className="w-4 h-4" />
              Browser Print Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optional browser print fallback — core architecture uses PrintJob + adapter */}
      <div id="receipt-print-container" className="hidden-except-print absolute -left-[9999px] top-0 pointer-events-none">
        {printType === 'customer' && (
          <CustomerReceipt 
            order={order} 
            taxBreakdown={taxBreakdown} 
            restaurantDetails={restaurantDetails} 
            serverName={serverName}
            guestCount={guestCount}
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
          />
        )}
      </div>

      <style jsx global>{`
        @media print {
          .hide-in-print {
            display: none !important;
          }
          .hidden-except-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};

export default PrintPreviewModal;
