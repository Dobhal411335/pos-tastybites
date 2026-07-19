import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  menuItemId: { type: String }, // Can be reference to MenuItem later
  name: { type: String, required: true },
  size: { type: String, default: "Standard" },
  qty: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  options: [{ type: String }],
});

const OrderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    orderNumber: { type: String, required: true, unique: true },
    items: [OrderItemSchema],
    subTotal: { type: Number, required: true },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    specialNote: { type: String },
    guestName: { type: String },
    contactNumber: { type: String },
    tableNo: { type: String },
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], default: 'PENDING' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Who took the order
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
