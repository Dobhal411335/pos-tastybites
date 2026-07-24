import mongoose from 'mongoose';

const StockInSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'StockProduct', required: true },
    date: { type: Date, required: true },
    quantity: { type: Number, required: true },
    value: { type: Number, required: true },
    invoiceNumber: { type: String, trim: true },
    tax: { type: Number },
    invoiceAmount: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.StockIn || mongoose.model('StockIn', StockInSchema);
