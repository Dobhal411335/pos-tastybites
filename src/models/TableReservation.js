import mongoose from "mongoose";

const TableReservationSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    guestName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    countryCode: { type: String, default: "+1", trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    /** YYYY-MM-DD (restaurant local) */
    date: { type: String, required: true, index: true },
    /** HH:mm 24h */
    time: { type: String, required: true },
    guests: { type: Number, required: true, min: 1, max: 50 },
    reasonForVisit: { type: String, default: null, trim: true },
    specialRequest: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "SEATED", "CANCELLED", "NO_SHOW"],
      default: "PENDING",
      index: true,
    },
    notes: { type: String, default: null },
    staffNote: { type: String, default: null },
    assignedTableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      default: null,
    },
    assignedTableNo: { type: String, default: null },
    tableSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableSession",
      default: null,
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    handledAt: { type: Date, default: null },
    source: { type: String, enum: ["ONLINE"], default: "ONLINE" },
  },
  { timestamps: true }
);

TableReservationSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
TableReservationSchema.index({ restaurantId: 1, date: 1, status: 1 });

export default mongoose.models.TableReservation ||
  mongoose.model("TableReservation", TableReservationSchema);
