import { Schema, models, model } from "mongoose";

const OfferDetailsSchema = new Schema(
    {
        // Section 1: More Offers card (SearchSection right sidebar)
        moreOffers: {
            title: { type: String, },
            description: { type: String, },
            knowMoreLink: { type: String, },
        },
        // Section 2: Last Minute Deal banner (AboutUsSection)
        lastMinuteDeal: {
            heading: { type: String,},
            description: { type: String, },
            link: { type: String, },
        },
        // Section 3: Promo banner (AboutUsSection)
        promoBanner: {
            description: { type: String, },
            link: { type: String,},
        },
    },
    { timestamps: true }
);

export default models.OfferDetails || model("OfferDetails", OfferDetailsSchema);
