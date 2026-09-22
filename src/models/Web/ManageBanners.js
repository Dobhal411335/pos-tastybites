import { Schema, models, model } from "mongoose";

const ManageBannersSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    /** Optional label for admin list only — not shown on the hero. */
    title: { type: String, default: "" },
    image: {
      url: { type: String, required: true },
      key: { type: String, default: "" },
    },
    /** Click-through URL (relative path or absolute http/https). */
    link: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.ManageBanner || model("ManageBanner", ManageBannersSchema);
