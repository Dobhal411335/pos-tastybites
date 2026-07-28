import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PopupBanner from "@/models/Web/popupBanner";
import { deleteImage } from "@/lib/cloudinary/deleteImage";
import { withAuth } from "@/utils/auth";


export const GET = withAuth(async (req) => {
    await connectDB();
    try {
        const banners = await PopupBanner.find({ restaurant: req.restaurant }).sort({ createdAt: -1 });
        return NextResponse.json(banners, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
    }
});


export const POST = withAuth(async (req) => {
    await connectDB();
    try {
        const { heading, paragraph, buttonLink, image } = await req.json();

        const newBanner = new PopupBanner({ restaurant: req.restaurant, heading, paragraph, buttonLink, image });
        await newBanner.save();
        return NextResponse.json(newBanner, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to create banner: ${error.message}` }, { status: 500 });
    }
});

export const PATCH = withAuth(async (req) => {
    await connectDB();

    try {
        const { id, heading, paragraph, buttonLink, image } = await req.json();
        const updateData = {};
        if (heading !== undefined) updateData.heading = heading;
        if (paragraph !== undefined) updateData.paragraph = paragraph;
        if (buttonLink !== undefined) updateData.buttonLink = buttonLink;
        if (image !== undefined) updateData.image = image;

        const updatedBanner = await PopupBanner.findOneAndUpdate(
            { _id: id, restaurant: req.restaurant },
            updateData,
            { new: true }
        );

        if (!updatedBanner) {
            return NextResponse.json({ error: "Banner not found" }, { status: 404 });
        }

        return NextResponse.json(updatedBanner, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
    }
});

export const DELETE = withAuth(async (req) => {
    await connectDB();

    try {
        const { id } = await req.json();

        // Find the banner first (scoped to restaurant)
        const banner = await PopupBanner.findOne({ _id: id, restaurant: req.restaurant });
        if (!banner) {
            return NextResponse.json({ error: "Banner not found" }, { status: 404 });
        }

        // Delete the image from Cloudinary (if key exists)
        if (banner.image?.key) {
            await deleteImage(banner.image.key);
        }

        // Delete banner from database
        await PopupBanner.findByIdAndDelete(id);

        return NextResponse.json({ message: "Popup Banner deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to delete banner: ${error.message}` }, { status: 500 });
    }
});
