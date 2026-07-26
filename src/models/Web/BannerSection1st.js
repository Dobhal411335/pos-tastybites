import { Schema, models, model } from "mongoose";

const BannerSection1stSchema = new Schema({
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    buttonLink: { type: String},
    image: { url: { type: String }, key: { type: String } },
    mobileImage: { url: { type: String }, key: { type: String } }
}, { timestamps: true });

export default models.BannerSection1st || model("BannerSection1st", BannerSection1stSchema);