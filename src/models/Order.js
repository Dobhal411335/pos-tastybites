import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  menuItemId: { type: String }, // Can be reference to MenuItem later
  name: { type: String, required: true },
  productCode: { type: String, default: "" },
  category: { type: String },
  size: { type: String, default: "Standard" },
  sizes: [{ type: String }],
  qty: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  options: [{ type: String }],
  preparationStyle: { type: String, default: null },
  sentQty: { type: Number, default: 0 },
  cartId: { type: String }, // To match incoming items reliably
});

const OrderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    orderNumber: { type: String, required: true, unique: true },
    items: [OrderItemSchema],
    subTotal: { type: Number, required: true },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    discountCode: { type: String, default: null },
    giftcardCode: { type: String, default: null },
    giftcardUsedAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    tipAmount: { type: Number, default: 0 },
    cashAmount: { type: Number, default: null },
    cardAmount: { type: Number, default: null },
    taxBreakdown: [
      {
        taxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },
        name: { type: String },
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    specialNote: { type: String },
    guestName: { type: String }, // legacy; kept in sync with partyName
    partyName: { type: String }, // customer / party name for the bill
    guestCount: { type: Number, default: null }, // guests at the table when order was taken
    contactNumber: { type: String },
    tableNo: { type: String }, // Legacy string reference
    tableSession: { type: mongoose.Schema.Types.ObjectId, ref: 'TableSession' },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'PAID', 'CANCELLED'], default: 'PENDING' },
    paymentStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'], default: 'UNPAID' },
    paymentMethod: { type: String },
    source: { type: String, default: 'POS' }, // E.g., 'POS', 'STAFF', 'ONLINE'
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Who took the order
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
