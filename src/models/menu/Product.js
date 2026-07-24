import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  size: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: Boolean, default: true },
});

const AddonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  size: { type: String, default: 'Regular' },
  status: { type: Boolean, default: true },
});

const ProductSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    taxes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tax' }],
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    image: { url: { type: String }, key: { type: String } },
    variants: [VariantSchema],
    addons: [AddonSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
