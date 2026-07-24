import mongoose from 'mongoose';

const StockTypeSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.StockType || mongoose.model('StockType', StockTypeSchema);
