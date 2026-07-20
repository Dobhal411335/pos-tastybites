import { Schema, models, model } from "mongoose";

const BannerSection3rdSchema = new Schema({
    buttonLink: { type: String},
    image: { url: { type: String }, key: { type: String } },
    mobileImage: { url: { type: String }, key: { type: String } }
}, { timestamps: true });

export default models.BannerSection3rd || model("BannerSection3rd", BannerSection3rdSchema);