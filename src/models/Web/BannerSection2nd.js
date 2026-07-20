import { Schema, models, model } from "mongoose";

const BannerSection2ndSchema = new Schema({
    buttonLink: { type: String},
    image: { url: { type: String }, key: { type: String } },
    mobileImage: { url: { type: String }, key: { type: String } }
}, { timestamps: true });

export default models.BannerSection2nd || model("BannerSection2nd", BannerSection2ndSchema);