import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "NEW_ORDER",
  "ORDER_UPDATED",
  "ORDER_CANCELLED",
  "ORDER_COMPLETED",
  "PAYMENT_COMPLETED",
  "PAYMENT_FAILED",
  "REFUND",
  "KOT_CREATED",
  "KOT_READY",
  "TABLE_ASSIGNED",
  "TABLE_RELEASED",
  "TABLE_TRANSFERRED",
  "TABLE_REASSIGNED",
  "EMPLOYEE_LOGIN",
  "EMPLOYEE_LOGOUT",
  "OVERTIME",
  "PRINT_FAILED",
  "SYSTEM_ALERT",
];

const NotificationSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    /**
     * RESTAURANT = all sales staff at this restaurant
     * USER = only recipientId (e.g. table transfer target)
     */
    recipientScope: {
      type: String,
      enum: ["RESTAURANT", "USER"],
      default: "RESTAURANT",
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ["EMPLOYEE", "ADMIN", "SALES"],
      default: "SALES",
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
      index: true,
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", default: null },
    tableSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableSession",
      default: null,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    printJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrintJob",
      default: null,
    },
    /** Compact display fields (order number, table no, amount, actor name) */
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Per-user read receipts for restaurant-scoped notifications */
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

NotificationSchema.index({ restaurantId: 1, createdAt: -1 });
NotificationSchema.index({ restaurantId: 1, type: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
