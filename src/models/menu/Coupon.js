import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    code: { type: String, required: true, trim: true },
    discountType: { type: String, enum: ['amount', 'percent'], required: true },
    value: { type: Number, required: true },
    validFrom: { type: Date },
    validUntil: { type: Date },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

// Ensure coupon codes are unique per restaurant
CouponSchema.index({ restaurant: 1, code: 1 }, { unique: true });

export default mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
