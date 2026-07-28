import connectDB from "@/lib/db";
import OfferDetails from "@/models/Web/OfferDetails";
import { NextResponse } from "next/server";

// GET — returns the single offer details document (or empty defaults)
export async function GET() {
    await connectDB();
    try {
        let doc = await OfferDetails.findOne({});
        return NextResponse.json(doc);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch offer details" }, { status: 500 });
    }
}

// POST / PUT — create or update the single document
export async function POST(req) {
    await connectDB();
    try {
        const body = await req.json();
        const { moreOffers, lastMinuteDeal, promoBanner } = body;

        let doc = await OfferDetails.findOne({});
        if (doc) {
            // Update existing
            if (moreOffers) doc.moreOffers = moreOffers;
            if (lastMinuteDeal) doc.lastMinuteDeal = lastMinuteDeal;
            if (promoBanner) doc.promoBanner = promoBanner;
            await doc.save();
        } else {
            // Create new
            doc = new OfferDetails({ moreOffers, lastMinuteDeal, promoBanner });
            await doc.save();
        }

        return NextResponse.json({ message: "Offer details saved successfully", data: doc });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save offer details" }, { status: 500 });
    }
}
