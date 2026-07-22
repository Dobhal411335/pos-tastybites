import mongoose from "mongoose";

const TableGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    tables: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
    }],
    color: {
      type: String,
      default: "#E5E7EB",
    }
  },
  { timestamps: true }
);

export default mongoose.models.TableGroup || mongoose.model("TableGroup", TableGroupSchema);
