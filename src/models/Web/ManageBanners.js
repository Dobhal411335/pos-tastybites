import { Schema, models, model } from "mongoose";

const ManageBannersSchema = new Schema({
    title: { type: String, required: true },
    image: { url: { type: String }, key: { type: String } },
    link: { type: String, required: true },
}, { timestamps: true });

export default models.ManageBanner || model("ManageBanner", ManageBannersSchema);