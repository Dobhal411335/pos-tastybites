import { Schema, models, model } from "mongoose";

const PopupBannerSchema = new Schema({
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    heading: { type: String },
    paragraph: { type: String },
    image: { url: { type: String }, key: { type: String } },
    buttonLink: { type: String },
}, { timestamps: true });

export default models.PopupBanner || model("PopupBanner", PopupBannerSchema);