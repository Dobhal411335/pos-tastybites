import mongoose from "mongoose";

const TableSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",
      required: true,
    },
    primaryTable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    linkedTables: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Table",
      },
    ],
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // Can also be Admin, but referencing Employee model is standard or we rely on just ObjectId without strict ref check
      required: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    closedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAYMENT_PENDING", "COMPLETED", "RELEASED"],
      default: "ACTIVE",
    },
    isSessionOpen: {
      type: Boolean,
      default: true,
      index: true,
    },
    guestCount: {
      type: Number,
      default: 1,
    },
    effectiveSeatCount: {
      type: Number,
      default: 0,
    },
    originalSeatCount: {
      type: Number,
      default: 0,
    },
    activeOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      }
    ],
    transferHistory: [
      {
        fromTable: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Table",
        },
        toTable: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Table",
        },
        transferredBy: {
          type: mongoose.Schema.Types.ObjectId,
        },
        transferredAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// CRITICAL CONCURRENCY RULE: Only ONE active TableSession may own a physical table at a time.
// The partialFilterExpression enforces this strictly at the database level.
// If two requests try to open the same table concurrently, MongoDB will reject the second one with a E11000 duplicate key error.
TableSessionSchema.index(
  { primaryTable: 1, isSessionOpen: 1 },
  { unique: true, partialFilterExpression: { isSessionOpen: true } }
);
TableSessionSchema.index({ linkedTables: 1, isSessionOpen: 1 });

if (
  mongoose.models.TableSession &&
  !mongoose.models.TableSession.schema.path("linkedTables")
) {
  delete mongoose.models.TableSession;
}

export default mongoose.models.TableSession || mongoose.model("TableSession", TableSessionSchema);
