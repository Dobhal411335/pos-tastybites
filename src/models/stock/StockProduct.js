import mongoose from 'mongoose';

const StockProductSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: mongoose.Schema.Types.ObjectId, ref: 'StockType', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'StockUnit', required: true },
    purchasePrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    status: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.StockProduct || mongoose.model('StockProduct', StockProductSchema);
