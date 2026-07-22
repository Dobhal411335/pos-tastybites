import mongoose from "mongoose";

const FloorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    width: {
      type: Number,
      default: 1000,
    },
    height: {
      type: Number,
      default: 800,
    },
    lastTableSequence: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

// Prevent duplicate floor names within the same restaurant
FloorSchema.index({ name: 1, restaurant: 1 }, { unique: true });

export default mongoose.models.Floor || mongoose.model("Floor", FloorSchema);
