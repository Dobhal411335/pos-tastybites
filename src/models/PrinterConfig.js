import mongoose from "mongoose";

const PRINTER_TARGETS = ["KITCHEN", "COUNTER", "RECEIPT"];
const CONNECTION_TYPES = ["USB", "NETWORK", "BLUETOOTH", "LAN"];
const PRINTER_TYPES = ["THERMAL"];
const PRINTER_LOCATIONS = ["COUNTER", "KITCHEN", "BAR"];

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
    type: {
      type: String,
      enum: PRINTER_TYPES,
      default: "THERMAL",
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
    /** Windows spooler queue name — required for USB */
    systemPrinterName: {
      type: String,
      trim: true,
      default: null,
    },
    /** IP / hostname — required for NETWORK/LAN; unused for USB */
    host: {
      type: String,
      trim: true,
      default: null,
    },
    port: {
      type: Number,
      default: null,
      min: 1,
      max: 65535,
    },
    location: {
      type: String,
      enum: PRINTER_LOCATIONS,
      default: null,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

PrinterConfigSchema.index({ restaurant: 1, target: 1 }, { unique: true });

export {
  PRINTER_TARGETS,
  CONNECTION_TYPES,
  PRINTER_TYPES,
  PRINTER_LOCATIONS,
};

export default mongoose.models.PrinterConfig ||
  mongoose.model("PrinterConfig", PrinterConfigSchema);
