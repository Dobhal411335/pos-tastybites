import { Schema, model, models } from "mongoose";

const ImageSchema = new Schema(
  {
    url: { type: String, default: "" },
    key: { type: String, default: "" },
  },
  { _id: false }
);

const GallerySectionSchema = new Schema(
  {
    images: {
      type: [ImageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default models.GallerySection ||
  model("GallerySection", GallerySectionSchema);
