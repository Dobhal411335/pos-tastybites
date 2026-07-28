import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PopupBanner from "@/models/Web/popupBanner";
import { deleteImage } from "@/lib/cloudinary/deleteImage";


export async function GET(req) {
    await connectDB();
    try {
        const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost'}`);
        const section = url.searchParams.get('section');
        const query = {};
        if (section) {
            query.section = section;
        }
        const banners = await PopupBanner.find(query).sort({ createdAt: -1 });
        return NextResponse.json(banners, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
    }
}


export async function POST(req) {
    await connectDB();
    try {
        const { heading, paragraph, buttonLink, image, section } = await req.json();

        const newBanner = new PopupBanner({ heading, paragraph, buttonLink, image, section: section || "frontend" });
        await newBanner.save();
        return NextResponse.json(newBanner, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to create banner: ${error.message}` }, { status: 500 });
    }
}

export async function PATCH(req) {
    await connectDB();

    try {
        const { id, heading, paragraph, buttonLink, image, section } = await req.json();
        const updateData = {};
        if (heading !== undefined) updateData.heading = heading;
        if (paragraph !== undefined) updateData.paragraph = paragraph;
        if (buttonLink !== undefined) updateData.buttonLink = buttonLink;
        if (image !== undefined) updateData.image = image;
        if (section !== undefined) updateData.section = section;

        const updatedBanner = await PopupBanner.findByIdAndUpdate(id, updateData, { new: true });
        return NextResponse.json(updatedBanner, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
    }
}

export async function DELETE(req) {
    await connectDB();

    try {
        const { id } = await req.json();

        // Find the banner first
        const banner = await PopupBanner.findById(id);
        if (!banner) {
            return NextResponse.json({ error: "Banner not found" }, { status: 404 });
        }

        // Delete the image from Uploadthing (if key exists)
        if (banner.image?.key) {
            await deleteImage(banner.image.key);
        }

        // Delete banner from database
        await PopupBanner.findByIdAndDelete(id);

        return NextResponse.json({ message: "Popup Banner deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to delete banner: ${error.message}` }, { status: 500 });
    }
}
