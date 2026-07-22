import mongoose from "mongoose";

const TableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    x: { type: Number },
    y: { type: Number },
    width: { type: Number },
    height: { type: Number },
    rotation: { type: Number, default: 0 },
    shape: { 
      type: String, 
      enum: ["rectangle", "circle", "square", "round", "booth"], 
      default: "rectangle" 
    },
    seats: { type: Number, default: 4 },
    section: { type: String, trim: true },
    color: { type: String, default: "#E5E7EB" }, // Tailwind zinc-200 or similar
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Reserved", "Out_of_Service"],
      default: "Available"
    }
  },
  { timestamps: true }
);

// Prevent duplicate table numbers within the same floor
TableSchema.index({ tableNumber: 1, floor: 1, restaurant: 1 }, { unique: true });

export default mongoose.models.Table || mongoose.model("Table", TableSchema);
