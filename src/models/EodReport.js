import mongoose from "mongoose";

const EodReportSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    businessDate: {
      type: String,
      required: true,
      trim: true,
    }, // YYYY-MM-DD in restaurant timezone
    status: {
      type: String,
      enum: ["SAVED"],
      default: "SAVED",
    },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    expectedDeposit: { type: Number, default: 0 },
    actualDeposit: { type: Number, default: null },
    overShort: { type: Number, default: 0 },
    reconciliation: {
      ok: { type: Boolean, default: true },
      messages: [{ type: String }],
      expectedPaymentTotal: { type: Number, default: 0 },
      actualPaymentTotal: { type: Number, default: 0 },
      difference: { type: Number, default: 0 },
    },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

EodReportSchema.index({ restaurant: 1, businessDate: 1 }, { unique: true });

export default mongoose.models.EodReport ||
  mongoose.model("EodReport", EodReportSchema);
