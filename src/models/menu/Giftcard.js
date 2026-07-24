import mongoose from 'mongoose';

const GiftcardSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    batchId: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, trim: true }, // e.g. "Welcome Gift", "Holiday Special"
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

// Ensure giftcard codes are unique per restaurant
GiftcardSchema.index({ restaurant: 1, code: 1 }, { unique: true });

export default mongoose.models.Giftcard || mongoose.model('Giftcard', GiftcardSchema);
