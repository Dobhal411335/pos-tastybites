import React from 'react';
import './print.css';
import moment from 'moment';

const KitchenOrderTicket = ({ order, kotItems = [] }) => {
  if (!order || !kotItems.length) return null;

  const {
    orderNumber,
    tableNo,
    guestName,
  } = order;

  // Group items if they had station/category data. For now, group under 'ITEMS'
  const groupedItems = kotItems.reduce((acc, item) => {
    const groupName = item.category || 'ITEMS';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {});

  return (
    <div className="receipt-font p-4 bg-white text-black" style={{ width: 'var(--print-width, 80mm)', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl receipt-bold underline mb-2 uppercase">Kitchen Order Ticket</h1>
        
        <div className="text-lg receipt-bold mb-2">
          {tableNo ? `Table: ${tableNo}` : 'Takeaway / No Table'}
        </div>
        
        <div className="receipt-divider border-t-2 border-black border-solid my-3" />
        
        <div className="text-left text-sm space-y-1">
          <div><span className="receipt-bold">Sent:</span> {moment().format('MMM DD, YYYY [at] hh:mm A')}</div>
          <div><span className="receipt-bold">Order #:</span> {orderNumber}</div>
          {guestName && <div><span className="receipt-bold">Party Name:</span> {guestName}</div>}
        </div>
      </div>

      <div className="receipt-divider border-t-2 border-black border-solid mb-4 mt-2" />

      {/* Items Grouped */}
      <div className="text-base">
        {Object.entries(groupedItems).map(([group, items], idx) => (
          <div key={idx} className="mb-6">
            <div className="receipt-bold uppercase mb-2 pb-1 border-b border-black">{group}</div>
            
            <div className="space-y-4 mt-3">
              {items.map((item, itemIdx) => (
                <div key={itemIdx}>
                  <div className="flex items-start">
                    <span className="receipt-bold mr-2 text-xs whitespace-nowrap">{item.qty} ×</span>
                    <span className="receipt-bold text-xs leading-tight">{item.name}</span>
                  </div>
                  
                  {/* Modifiers visually indented */}
                  {item.options && item.options.length > 0 && (
                    <div className="pl-8 mt-1 space-y-1">
                      {item.options.map((opt, oIdx) => (
                        <div key={oIdx} className="text-xs font-semibold italic text-gray-800">
                          + {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="receipt-divider border-t-2 border-black border-solid mt-4 mb-2" />
      <div className="text-center text-xs mt-2 italic">
        Kitchen Ticket Order #{orderNumber}
      </div>
    </div>
  );
};

export default KitchenOrderTicket;
