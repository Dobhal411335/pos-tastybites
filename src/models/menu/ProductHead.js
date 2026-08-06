import mongoose from 'mongoose';

const ProductHeadSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Head', required: true },
    categories: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
        products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

export default mongoose.models.ProductHead || mongoose.model('ProductHead', ProductHeadSchema);
