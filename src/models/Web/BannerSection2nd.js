import { Schema, models, model } from "mongoose";

const BannerSection2ndSchema = new Schema({
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    buttonLink: { type: String},
    image: { url: { type: String }, key: { type: String } },
    mobileImage: { url: { type: String }, key: { type: String } }
}, { timestamps: true });

export default models.BannerSection2nd || model("BannerSection2nd", BannerSection2ndSchema);