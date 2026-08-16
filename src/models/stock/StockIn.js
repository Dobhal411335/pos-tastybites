import mongoose from 'mongoose';

const StockInItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'StockProduct', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
);

const StockInSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    date: { type: Date, required: true },
    items: { type: [StockInItemSchema], default: [] },
    invoiceNumber: { type: String, trim: true },
    tax: { type: Number },
    invoiceAmount: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.StockIn || mongoose.model('StockIn', StockInSchema);
