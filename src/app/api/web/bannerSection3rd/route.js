import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import BannerSection3rd from "@/models/Web/BannerSection3rd";
import { deleteImage } from "@/lib/cloudinary/deleteImage";
import { withAuth } from "@/utils/auth";

export const GET = withAuth(async (req) => {
    await connectDB();
    try {     
        const banners = await BannerSection3rd.find({ restaurant: req.restaurant }).sort({ createdAt: -1 });
        return NextResponse.json(banners, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
    }
});

export const POST = withAuth(async (req) => {
    await connectDB();
    try {
        const { buttonLink, image, mobileImage } = await req.json();

        const newBanner = new BannerSection3rd({ restaurant: req.restaurant, buttonLink, image, mobileImage });
        await newBanner.save();
        return NextResponse.json(newBanner, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to create banner: ${error.message}` }, { status: 500 });
    }
});

export const PATCH = withAuth(async (req) => {
    await connectDB();
    try {
        const { id, buttonLink, image, mobileImage } = await req.json();
        const updateData = {};
        if (buttonLink !== undefined) updateData.buttonLink = buttonLink;
        if (image !== undefined) updateData.image = image;
        if (mobileImage !== undefined) updateData.mobileImage = mobileImage;

        const updatedBanner = await BannerSection3rd.findOneAndUpdate(
            { _id: id, restaurant: req.restaurant }, 
            updateData, 
            { new: true }
        );
        if (!updatedBanner) {
            return NextResponse.json({ error: "Banner not found or unauthorized" }, { status: 404 });
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

        // Find the banner first
        const banner = await BannerSection3rd.findOne({ _id: id, restaurant: req.restaurant });
        if (!banner) {
            return NextResponse.json({ error: "Banner not found or unauthorized" }, { status: 404 });
        }

        // Delete the image from Uploadthing (if key exists)
        if (banner.image?.key) {
            await deleteImage(banner.image.key);
        }
        if (banner.mobileImage?.key) {
            await deleteImage(banner.mobileImage.key);
        }

        // Delete banner from database
        await BannerSection3rd.findByIdAndDelete(id);

        return NextResponse.json({ message: "Banner deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to delete banner: ${error.message}` }, { status: 500 });
    }
});
