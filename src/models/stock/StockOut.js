import mongoose from 'mongoose';

const StockOutSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'StockProduct', required: true },
    date: { type: Date, required: true },
    quantity: { type: Number, required: true },
    value: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.StockOut || mongoose.model('StockOut', StockOutSchema);
