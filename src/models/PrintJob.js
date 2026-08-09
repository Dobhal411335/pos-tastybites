import mongoose from "mongoose";

const PrintJobSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    printType: {
      type: String,
      enum: ["RECEIPT", "KOT"],
      required: true,
    },
    printerTarget: {
      type: String,
      enum: ["RECEIPT", "KITCHEN"],
      required: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "PRINTING", "PRINTED", "FAILED", "CANCELLED"],
      default: "QUEUED",
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    startedAt: { type: Date },
    printedAt: { type: Date },
    failedAt: { type: Date },
    errorMessage: { type: String, default: null },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    /**
     * Lightweight job-specific data only (not a full order dump).
     * KOT: { kotItems, specialNote, guestCount, tableNo, serverName, restaurantName }
     * RECEIPT: { guestCount, tableNo, serverName } — totals come from Order
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /** Prevents duplicate jobs for the same logical action */
    idempotencyKey: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

PrintJobSchema.index(
  { restaurantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

export default mongoose.models.PrintJob || mongoose.model("PrintJob", PrintJobSchema);
