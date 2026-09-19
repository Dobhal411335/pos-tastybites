import mongoose from "mongoose";

const OrderEmailOtpSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    hash: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    guestName: { type: String, default: null },
    /** Set when guest verifies OTP but has not yet used it (e.g. table booking). */
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrderEmailOtpSchema.index({ restaurantId: 1, email: 1 }, { unique: true });
// Auto-remove expired docs (MongoTTL runs periodically)
OrderEmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OrderEmailOtp ||
  mongoose.model("OrderEmailOtp", OrderEmailOtpSchema);
