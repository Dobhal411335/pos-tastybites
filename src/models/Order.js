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
  serviceCharge: { type: Number, default: 0 },
  options: [{ type: String }],
  preparationStyle: { type: String, default: null },
  productType: { type: String, enum: ['KITCHEN', 'BAR'], default: 'KITCHEN' },
  isOffer: { type: Boolean, default: false },
  inclusions: [{ type: String }],
  choices: [{ type: String }],
  choiceSelections: [
    {
      name: { type: String, trim: true },
      subChoices: [{ type: String, trim: true }],
    },
  ],
  addonChoiceSelections: [
    {
      name: { type: String, trim: true },
      subChoices: [{ type: String, trim: true }],
    },
  ],
  drinks: [{ type: String }],
  sentQty: { type: Number, default: 0 },
  cartId: { type: String }, // To match incoming items reliably
});

const OrderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    orderNumber: { type: String, required: true },
    /** First assigned order # at create (historical reference). */
    originalOrderNumber: { type: String, default: null },
    invoiceNumber: { type: String },
    /** First assigned invoice # at create (historical reference). */
    originalInvoiceNumber: { type: String, default: null },
    items: [OrderItemSchema],
    /** Soft-delete: inactive orders are excluded from active reports. */
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    deletionReason: { type: String, default: null },
    restoredAt: { type: Date, default: null },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    permanentlyDeletedAt: { type: Date, default: null },
    permanentlyDeletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    subTotal: { type: Number, required: true },
    taxTotal: { type: Number, default: 0 },
    serviceChargeTotal: { type: Number, default: 0 },
    serviceChargeName: { type: String, default: null },
    discountTotal: { type: Number, default: 0 },
    discountCode: { type: String, default: null },
    discountPercent: { type: Number, default: null },
    giftcardCode: { type: String, default: null },
    giftcardUsedAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    tipAmount: { type: Number, default: 0 },
    tipMethod: { type: String, default: null }, // Cash | Card | Gift Card
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
    contactNumber: { type: String }, // optional guest phone (digits only)
    guestCountryCode: { type: String, default: null }, // e.g. +1
    guestEmail: { type: String, default: null }, // optional guest email
    tableNo: { type: String }, // Legacy string reference
    tableSession: { type: mongoose.Schema.Types.ObjectId, ref: 'TableSession', index: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'PAID', 'CANCELLED', 'WAIVED'], default: 'PENDING' },
    paymentStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'], default: 'UNPAID' },
    paymentMethod: { type: String },
    waiveReason: { type: String, default: null },
    waivedAt: { type: Date, default: null },
    waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    source: { type: String, enum: ['POS', 'WALK_IN', 'STAFF', 'ONLINE'], default: 'POS' },
    staffFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    staffOrderReason: { type: String, default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Original order taker — sales/tip credit. Never reassigned on payment or table transfer.
  },
  { timestamps: true }
);

// Partial unique among active orders only — name must differ from legacy full unique index.
OrderSchema.index(
  { restaurantId: 1, orderNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: "restaurantId_1_orderNumber_1_active",
  }
);
OrderSchema.index(
  { restaurantId: 1, invoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: "restaurantId_1_invoiceNumber_1_active",
  }
);
OrderSchema.index({ restaurantId: 1, isActive: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, processedBy: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, updatedAt: 1, paymentStatus: 1 });
OrderSchema.index({ restaurantId: 1, updatedAt: 1, status: 1 });
OrderSchema.index({ restaurantId: 1, processedBy: 1, updatedAt: 1 });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
