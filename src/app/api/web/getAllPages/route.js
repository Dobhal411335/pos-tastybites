import connectDB from "@/lib/db";
import Page from "@/models/Web/Page";
import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";
import { deleteImage } from "@/lib/cloudinary/deleteImage";

// GET all webpages
export const GET = withAuth(async (req) => {
    try {
        await connectDB();
        const query = { restaurant: req.restaurant };
        const pages = await Page.find(query);
        return NextResponse.json({ pages }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to fetch webpages", error: error.message }, { status: 500 });
    }
});

const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")  // Remove special characters
        .trim()
        .replace(/\s+/g, "-"); // Replace spaces with dashes
};

// POST: Create a new webpage
export const POST = withAuth(async (req) => {
    try {
        await connectDB();
        const { title, url } = await req.json();

        if (!title || !url) {
            return NextResponse.json({ message: "Title and URL are required!" }, { status: 400 });
        }

        const link = generateSlug(title); // Auto-generate link

        const newPage = new Page({ restaurant: req.restaurant, title, url, link });
        await newPage.save();

        return NextResponse.json({ message: "Webpage created successfully", page: newPage }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
});

// PATCH: Update an existing webpage
export const PATCH = withAuth(async (req) => {
    try {
        await connectDB();
        const { id, title, url } = await req.json();

        if (!id || !title || !url) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const link = generateSlug(title); // Auto-generate link
        const updateData = { title, url, link };

        const updatedPage = await Page.findOneAndUpdate(
            { _id: id, restaurant: req.restaurant },
            updateData,
            { new: true }
        );

        if (!updatedPage) {
            return NextResponse.json({ message: "Page not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Page updated successfully", page: updatedPage }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
});

// DELETE: Remove a webpage
export const DELETE = withAuth(async (req) => {
    try {
        await connectDB();
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ message: "Page ID is required" }, { status: 400 });
        }

        const pageToDelete = await Page.findOne({ _id: id, restaurant: req.restaurant });

        if (!pageToDelete) {
            return NextResponse.json({ message: "Page not found or unauthorized" }, { status: 404 });
        }

        // Delete image from Cloudinary before deleting from database
        if (pageToDelete.images?.key) {
            await deleteImage(pageToDelete.images.key);
        }

        // Now delete the page from the database
        await Page.findByIdAndDelete(id);

        return NextResponse.json({ message: "Page and image deleted successfully" }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
});