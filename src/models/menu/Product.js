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

const ChoiceOptionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subChoices: [{ type: String, trim: true }],
});

const ProductSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
    productCode: { type: String, trim: true, default: '' },
    productType: {
      type: String,
      enum: ['KITCHEN', 'BAR'],
      default: 'KITCHEN',
      required: true,
    },
    description: { type: String, trim: true, default: '' },
    taxes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tax' }],
    taxData: {
      totalPercentage: { type: Number, default: 0 },
      totalFixed: { type: Number, default: 0 },
      taxNames: [{ type: String }]
    },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    discountActive: { type: Boolean, default: true },
    image: { url: { type: String }, key: { type: String } },
    variants: [VariantSchema],
    addons: [AddonSchema],
    choiceOptions: [ChoiceOptionSchema],
    preparationStyles: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
