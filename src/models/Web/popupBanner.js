import { Schema, models, model } from "mongoose";

const PopupBannerSchema = new Schema({
    heading: { type: String },
    paragraph: { type: String },
    image: { url: { type: String }, key: { type: String } },
    buttonLink: { type: String},
    section: {type: String, required: true}
}, { timestamps: true });

export default models.PopupBanner || model("PopupBanner", PopupBannerSchema);