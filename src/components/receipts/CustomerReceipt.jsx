import React from 'react';
import './print.css';
import moment from 'moment';

const CustomerReceipt = ({ order, restaurantDetails, taxBreakdown = [], serverName }) => {
  if (!order) return null;

  const {
    orderNumber,
    items = [],
    subTotal = 0,
    totalAmount = 0,
    guestName,
    tableNo,
    processedBy,
    createdAt
  } = order;

  // Use fallback data if restaurant details not fully provided
  const restName = restaurantDetails?.name || 'TASTY BITES';
  const restAddress = restaurantDetails?.address || '345 Main Street South\nExeter, ON, Canada, N0M 1S6';
  const restPhone = restaurantDetails?.phone || 'Tel: +1 519 235 0050';
  const hstNumber = restaurantDetails?.hstNumber || '123456789 RT0001';

  // Calculate tip guide dynamically
  const tip15 = (subTotal * 0.15).toFixed(2);
  const tip18 = (subTotal * 0.18).toFixed(2);
  const tip20 = (subTotal * 0.20).toFixed(2);

  return (
    <div className="receipt-font text-xs p-4 bg-white" style={{ width: 'var(--print-width, 80mm)', margin: '0 auto' }}>
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg receipt-bold mb-1">{restName}</h1>
        <div className="whitespace-pre-line">{restAddress}</div>
        <div>{restPhone}</div>
        <div className="mt-2 text-[10px]">
          Printed {moment().format('MMM DD, YYYY')} at {moment().format('hh:mm A')}
        </div>
      </div>

      <div className="receipt-divider" />

      {/* Order Info */}
      <div className="mb-4 grid grid-cols-2 gap-y-2 text-[10px]">
        {/* Row 1 */}
        <div className="flex gap-1">
          <span className="text-zinc-500">Order #:</span>
          <span className="receipt-bold">{orderNumber}</span>
        </div>
        <div className="flex justify-end gap-1">
          <span className="text-zinc-500">Server:</span>
          <span className="receipt-bold">{serverName || (typeof processedBy === 'object' ? (processedBy.name || processedBy.firstName) : 'Server')}</span>
        </div>

        {/* Row 2 */}
        <div className="flex gap-1">
          <span className="text-zinc-500">Date:</span>
          <span className="receipt-bold">{moment(createdAt).format('MMM DD, YYYY [at] hh:mm A')}</span>
        </div>
        <div className="flex justify-end gap-1">
          <span className="text-zinc-500">Table:</span>
          <span className="receipt-bold">{tableNo || 'N/A'}</span>
        </div>

        {/* Row 3 */}
        <div className="flex gap-1">
          <span className="text-zinc-500">HST #:</span>
          <span className="receipt-bold">{hstNumber}</span>
        </div>
        <div className="flex justify-end gap-1">
          <span className="text-zinc-500">Party Name:</span>
          <span className="receipt-bold">{guestName || 'N/A'}</span>
        </div>

        {/* Row 4 (Dynamic Taxes in Header) */}
        {taxBreakdown.map((tax, idx) => (
          <div key={idx} className="flex gap-1 col-span-2">
            <span className="text-zinc-500">{tax.name} #:</span>
            <span className="receipt-bold">{hstNumber}</span>
          </div>
        ))}
      </div>

      <div className="receipt-divider" />

      {/* Items List */}
      <div className="mb-4">
        <div className="flex justify-between receipt-bold mb-2">
          <span>ITEM DESCRIPTION</span>
          <span>AMOUNT</span>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="mb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                {item.qty > 1 ? `${item.qty} × ` : ''}
                {item.name}
              </div>
              <span>${(item.price * item.qty).toFixed(2)}</span>
            </div>
            {/* Options / Modifiers */}
            {item.options && item.options.length > 0 && (
              <div className="pl-4 text-[10px] mt-0.5">
                {item.options.map((opt, oIdx) => (
                  <div key={oIdx}>+ {opt}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="receipt-divider" />

      {/* Totals */}
      <div className="mb-4 flex flex-col items-end space-y-1 text-[11px]">
        <div className="w-[140px] flex justify-between">
          <span className="text-zinc-500">Food Total:</span>
          <span className="receipt-bold">${subTotal.toFixed(2)}</span>
        </div>
        <div className="w-[140px] flex justify-between">
          <span className="text-zinc-500">Sub Total:</span>
          <span className="receipt-bold">${subTotal.toFixed(2)}</span>
        </div>
        
        {/* Dynamic Tax Breakdown */}
        {taxBreakdown.map((tax, idx) => (
          <div key={idx} className="w-[140px] flex justify-between">
            <span className="text-zinc-500">{tax.name}:</span>
            <span className="receipt-bold">${tax.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="receipt-divider" />
      
      <div className="flex justify-between text-base receipt-bold mb-4">
        <span>Total:</span>
        <span>${totalAmount.toFixed(2)}</span>
      </div>
      
      <div className="receipt-divider" />

      {/* Tip Guide */}
      <div className="mb-6 text-center">
        <div className="receipt-bold mb-2">SUGGESTED TIP GUIDE</div>
        <div className="flex justify-between text-[10px]">
          <span>15% = ${tip15}</span>
          <span>18% = ${tip18}</span>
          <span>20% = ${tip20}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] space-y-1">
        <div className="receipt-bold">Thank You! Please Come Again!</div>
        <div>Printed from Tasty Bites POS</div>
      </div>
    </div>
  );
};

export default CustomerReceipt;
