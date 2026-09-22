import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";
import connectDB from "@/lib/db";
import ManageBanner from "@/models/Web/ManageBanners";
import { deleteImage } from "@/lib/cloudinary/deleteImage";

export const PUT = withAuth(async (req, { params }) => {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { title, image, link } = body;

    if (link !== undefined && !String(link || "").trim()) {
      return NextResponse.json(
        { success: false, message: "Link URL is required" },
        { status: 400 }
      );
    }

    const updateData = {
      ...(title !== undefined && { title: String(title || "").trim() }),
      ...(link !== undefined && { link: String(link).trim() }),
      ...(image?.url && {
        image: {
          url: image.url,
          key: image.key || "",
        },
      }),
    };

    const updated = await ManageBanner.findOneAndUpdate(
      { _id: id, restaurant: req.restaurant },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update banner",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req, { params }) => {
  try {
    await connectDB();
    const { id } = await params;

    const deleted = await ManageBanner.findOneAndDelete({
      _id: id,
      restaurant: req.restaurant,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }

    if (deleted.image?.key) {
      try {
        await deleteImage(deleted.image.key);
      } catch (cloudinaryError) {
        console.error("Error deleting image from Cloudinary:", cloudinaryError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete banner",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
});
