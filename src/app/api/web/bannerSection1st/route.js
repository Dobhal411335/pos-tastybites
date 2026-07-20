import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import BannerSection1st from "@/models/Web/BannerSection1st";
import { deleteImage } from "@/lib/cloudinary/deleteImage";


export async function GET(req) {
    await connectDB();
    try {
        const banners = await BannerSection1st.find().sort({ createdAt: -1 });
        return NextResponse.json(banners, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
    }
}

export async function POST(req) {
    await connectDB();
    try {
        const { buttonLink, image, mobileImage } = await req.json();

        const newBanner = new BannerSection1st({ buttonLink, image, mobileImage });
        await newBanner.save();
        return NextResponse.json(newBanner, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to create banner: ${error.message}` }, { status: 500 });
    }
}

export async function PATCH(req) {
    await connectDB();
    try {
        const { id, buttonLink, image, mobileImage } = await req.json();
        const updateData = {};
        if (buttonLink !== undefined) updateData.buttonLink = buttonLink;
        if (image !== undefined) updateData.image = image;
        if (mobileImage !== undefined) updateData.mobileImage = mobileImage;

        const updatedBanner = await BannerSection1st.findByIdAndUpdate(id, updateData, { new: true });
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
        const banner = await BannerSection1st.findById(id);
        if (!banner) {
            return NextResponse.json({ error: "Banner not found" }, { status: 404 });
        }

        // Delete the image from Uploadthing (if key exists)
        if (banner.image?.key) {
            await deleteImage(banner.image.key);
        }
        if (banner.mobileImage?.key) {
            await deleteImage(banner.mobileImage.key);
        }

        // Delete banner from database
        await BannerSection1st.findByIdAndDelete(id);

        return NextResponse.json({ message: "Banner deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to delete banner: ${error.message}` }, { status: 500 });
    }
}
