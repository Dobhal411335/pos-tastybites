import connectDB from "@/lib/db";
import { NextResponse } from "next/server";
import FooterSection from "@/models/Web/FooterSection";
import { withAuth } from "@/utils/auth";

export const GET = withAuth(async (req) => {
  await connectDB();

  try {
    let footer = await FooterSection.findOne({ restaurant: req.restaurant }).lean();
    return NextResponse.json({ success: true, data: footer });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch footer settings" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req) => {
  await connectDB();

  try {
    const body = await req.json();

    const normalizedColumns = (Array.isArray(body.columns) ? body.columns : []).map(
      (col, colIdx) => ({
        title: String(col.title || "").trim(),
        order: Number(col.order) || colIdx + 1,
        active: col.active ?? true,
        links: (Array.isArray(col.links) ? col.links : []).map((lnk, lnkIdx) => ({
          label: String(lnk.label || "").trim(),
          url: String(lnk.url || "").trim() || "#",
          order: Number(lnk.order) || lnkIdx + 1,
          active: lnk.active ?? true,
        })),
      })
    );

    const updateData = {
      thankYou: String(body.thankYou || "").trim() || "Thank you for visiting",
      description: String(body.description || "").trim(),
      columns: normalizedColumns,
    };

    const footer = await FooterSection.findOneAndUpdate(
      { restaurant: req.restaurant },
      { ...updateData, restaurant: req.restaurant },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    return NextResponse.json({
      success: true,
      message: "Footer settings saved successfully",
      data: footer,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save footer settings" },
      { status: 500 }
    );
  }
});

export const PUT = POST;
