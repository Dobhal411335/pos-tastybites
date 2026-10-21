import { Schema, model, models } from "mongoose";

const FooterLinkSchema = new Schema(
  {
    label: { type: String, default: "" },
    url: { type: String, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const FooterColumnSchema = new Schema(
  {
    title: { type: String, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    links: { type: [FooterLinkSchema], default: [] },
  },
  { _id: false }
);

const FooterSectionSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      index: true,
    },
    thankYou: { type: String, default: "Thank you for visiting" },
    description: {
      type: String,
      default:
        "Order online, pick up at our store, and pay when you arrive. Fresh food made to order — no delivery.",
    },
    columns: { type: [FooterColumnSchema], default: [] },
  },
  { timestamps: true }
);

export default models.FooterSection ||
  model("FooterSection", FooterSectionSchema);
