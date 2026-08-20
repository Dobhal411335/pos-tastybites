import mongoose from 'mongoose';

const StockOutSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'StockProduct', required: true },
    date: { type: Date, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, default: 0, min: 0 },
    value: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

StockOutSchema.index({ restaurant: 1, date: -1 });
StockOutSchema.index({ restaurant: 1, product: 1, date: -1 });

export default mongoose.models.StockOut || mongoose.model('StockOut', StockOutSchema);
