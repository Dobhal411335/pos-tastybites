import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  menuItemId: { type: String }, // Can be reference to MenuItem later
  name: { type: String, required: true },
  category: { type: String },
  size: { type: String, default: "Standard" },
  qty: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  options: [{ type: String }],
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
    specialNote: { type: String },
    guestName: { type: String },
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
