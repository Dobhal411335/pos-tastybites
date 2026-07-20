import connectDB from "@/lib/db";
import Webpage from "@/models/Web/Webpage";
import { NextResponse } from "next/server";

export async function GET(_request, { params }) {
  try {
    await connectDB();
    const { slug } = await params;

    const webpage = await Webpage.findOne({
      slug: decodeURIComponent(slug).toLowerCase(),
      active: true,
    });

    if (!webpage) {
      return NextResponse.json({ error: "Webpage not found" }, { status: 404 });
    }

    return NextResponse.json(webpage, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch webpage", message: error.message }, { status: 500 });
  }
}
