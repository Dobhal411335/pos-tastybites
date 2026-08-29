import mongoose from "mongoose";

const PRINTER_TARGETS = ["KITCHEN", "COUNTER", "RECEIPT"];
const CONNECTION_TYPES = ["LAN"];

const PrinterConfigSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    target: {
      type: String,
      enum: PRINTER_TARGETS,
      required: true,
    },
    connectionType: {
      type: String,
      enum: CONNECTION_TYPES,
      default: "LAN",
    },
    host: {
      type: String,
      required: true,
      trim: true,
    },
    port: {
      type: Number,
      default: 9100,
      min: 1,
      max: 65535,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

PrinterConfigSchema.index({ restaurant: 1, target: 1 }, { unique: true });

export { PRINTER_TARGETS, CONNECTION_TYPES };

export default mongoose.models.PrinterConfig ||
  mongoose.model("PrinterConfig", PrinterConfigSchema);
