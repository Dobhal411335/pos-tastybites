import { Schema, models, model } from "mongoose";

const OfferDetailsSchema = new Schema(
    {
        restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        // More Offers card (SearchSection right sidebar)
        moreOffers: {
            title: { type: String },
            description: { type: String },
            knowMoreLink: { type: String },
        },
        // Last Minute Deal banner (AboutUsSection)
        lastMinuteDeal: {
            heading: { type: String },
            description: { type: String },
            link: { type: String },
        },
        // Promo banner (AboutUsSection)
        promoBanner: {
            description: { type: String },
            link: { type: String },
        },
    },
    { timestamps: true }
);

export default models.OfferDetails || model("OfferDetails", OfferDetailsSchema);
