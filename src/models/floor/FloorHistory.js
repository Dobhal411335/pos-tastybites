import mongoose from "mongoose";

const FloorHistorySchema = new mongoose.Schema(
  {
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
    action: {
      type: String,
      required: true,
      enum: ["CREATE_FLOOR", "UPDATE_FLOOR", "CREATE_TABLE", "UPDATE_TABLE", "DELETE_TABLE", "MOVE_TABLE", "ASSIGN_EMPLOYEE"],
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Can store previous and new state
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }
  },
  { timestamps: true }
);

export default mongoose.models.FloorHistory || mongoose.model("FloorHistory", FloorHistorySchema);
