import { Schema, models, model } from "mongoose";

const PageSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    link: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

export default models.Page || model("Page", PageSchema);
