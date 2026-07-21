import { Schema, models, model } from "mongoose";

const NavbarSubSectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, default: "#", trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const NavbarSectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, default: "#", trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    subSections: [NavbarSubSectionSchema],
  },
  { timestamps: true }
);

export default models.NavbarSection || model("NavbarSection", NavbarSectionSchema);