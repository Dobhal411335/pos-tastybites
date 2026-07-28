import connectDB from "@/lib/db";
import OfferDetails from "@/models/Web/OfferDetails";
import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";

// GET — returns the single offer details document for this restaurant
export const GET = withAuth(async (req) => {
    await connectDB();
    try {
        const doc = await OfferDetails.findOne({ restaurant: req.restaurant });
        return NextResponse.json(doc);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch offer details" }, { status: 500 });
    }
});

// POST — create or update the single document for this restaurant
export const POST = withAuth(async (req) => {
    await connectDB();
    try {
        const body = await req.json();
        const { moreOffers, lastMinuteDeal, promoBanner } = body;

        let doc = await OfferDetails.findOne({ restaurant: req.restaurant });
        if (doc) {
            // Update existing
            if (moreOffers) doc.moreOffers = moreOffers;
            if (lastMinuteDeal) doc.lastMinuteDeal = lastMinuteDeal;
            if (promoBanner) doc.promoBanner = promoBanner;
            await doc.save();
        } else {
            // Create new
            doc = new OfferDetails({ restaurant: req.restaurant, moreOffers, lastMinuteDeal, promoBanner });
            await doc.save();
        }

        return NextResponse.json({ message: "Offer details saved successfully", data: doc });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save offer details" }, { status: 500 });
    }
});
