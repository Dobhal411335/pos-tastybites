import mongoose from "mongoose";

const PRINTER_TARGETS = ["KITCHEN", "COUNTER", "RECEIPT"];
const CONNECTION_TYPES = ["USB", "NETWORK", "BLUETOOTH", "LAN"];
const PRINTER_TYPES = ["THERMAL"];
const PRINTER_LOCATIONS = ["COUNTER", "KITCHEN", "BAR"];
const ORDER_TYPES = ["TAKE_AWAY", "DINE_IN", "DELIVERY"];
const PAPER_WIDTHS_MM = [58, 72, 78, 80];

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
    /** Windows spooler queue name — required for USB; BUILTIN for Android tablet */
    systemPrinterName: {
      type: String,
      trim: true,
      default: null,
    },
    /** IP / hostname — required for NETWORK/LAN; unused for USB/BT */
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
    /** Classic Bluetooth MAC address (AA:BB:CC:DD:EE:FF) */
    bluetoothAddress: {
      type: String,
      trim: true,
      default: null,
    },
    /** Optional Android USB device identity */
    usbVendorId: {
      type: Number,
      default: null,
      min: 0,
      max: 65535,
    },
    usbProductId: {
      type: Number,
      default: null,
      min: 0,
      max: 65535,
    },
    /** Thermal paper width in mm */
    paperWidthMm: {
      type: Number,
      enum: PAPER_WIDTHS_MM,
      default: 80,
    },
    /** Which order types this printer should handle */
    orderTypes: {
      type: [
        {
          type: String,
          enum: ORDER_TYPES,
        },
      ],
      default: () => ["TAKE_AWAY", "DINE_IN", "DELIVERY"],
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
    /** Last on-site TCP/USB/BT reachability check (reported by mobile / Electron / print-bridge) */
    lastReachability: {
      status: {
        type: String,
        enum: ["reachable", "unreachable", "unknown"],
        default: "unknown",
      },
      checkedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
      source: {
        type: String,
        enum: ["mobile", "electron", "print-bridge"],
        default: undefined,
      },
      requestId: {
        type: String,
        trim: true,
        default: null,
      },
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
  ORDER_TYPES,
  PAPER_WIDTHS_MM,
};

export default mongoose.models.PrinterConfig ||
  mongoose.model("PrinterConfig", PrinterConfigSchema);
