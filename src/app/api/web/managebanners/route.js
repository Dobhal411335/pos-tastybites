import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";
import connectDB from "@/lib/db";
import ManageBanner from "@/models/Web/ManageBanners";

export const GET = withAuth(async (req) => {
  try {
    await connectDB();
    const banners = await ManageBanner.find({ restaurant: req.restaurant }).sort({
      createdAt: -1,
    });
    return NextResponse.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banners" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req) => {
  try {
    await connectDB();
    const body = await req.json();
    const { title, image, link } = body;

    if (!image?.url || !String(link || "").trim()) {
      return NextResponse.json(
        { success: false, message: "Image and link URL are required" },
        { status: 400 }
      );
    }

    const banner = new ManageBanner({
      restaurant: req.restaurant,
      title: String(title || "").trim(),
      link: String(link).trim(),
      image: {
        url: image.url,
        key: image.key || "",
      },
    });

    await banner.save();

    return NextResponse.json({ success: true, data: banner }, { status: 201 });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create banner",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
});
