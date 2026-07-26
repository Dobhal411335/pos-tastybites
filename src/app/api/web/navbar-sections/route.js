import connectDB from "@/lib/db";
import { NextResponse } from "next/server";
import NavbarSection from "@/models/Web/NavbarSection";
import { withAuth } from "@/utils/auth";

const normalizeSubSections = (subSections = []) =>
  subSections
    .filter((item) => item && item.title && item.title.trim())
    .map((item, index) => ({
      title: item.title.trim(),
      url: item.url?.trim() || "#",
      active: item.active ?? true,
      order: item.order === "" || item.order === undefined ? index + 1 : Number(item.order),
    }));

export const GET = withAuth(async (req) => {
  await connectDB();

  try {
    const sections = await NavbarSection.find({ restaurant: req.restaurant })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch navbar sections" }, { status: 500 });
  }
});

export const POST = withAuth(async (req) => {
  await connectDB();

  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ message: "Section title is required" }, { status: 400 });
    }

    const lastSection = await NavbarSection.findOne({ restaurant: req.restaurant }).sort({ order: -1 }).select("order").lean();
    const section = await NavbarSection.create({
      restaurant: req.restaurant,
      title: body.title.trim(),
      url: body.url?.trim() || "#",
      active: body.active ?? true,
      order: body.order === "" || body.order === undefined ? (lastSection?.order || 0) + 1 : Number(body.order),
      subSections: normalizeSubSections(body.subSections),
    });

    return NextResponse.json({ message: "Navbar section created successfully", section }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to create navbar section" }, { status: 500 });
  }
});

export const PUT = withAuth(async (req) => {
  await connectDB();

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ message: "Section id is required" }, { status: 400 });
    }

    const updatedSection = await NavbarSection.findOneAndUpdate(
      { _id: id, restaurant: req.restaurant },
      {
        ...data,
        title: data.title?.trim(),
        url: data.url?.trim() || "#",
        order: data.order === "" || data.order === undefined ? 0 : Number(data.order),
        subSections: Array.isArray(data.subSections) ? normalizeSubSections(data.subSections) : [],
      },
      { new: true }
    );

    if (!updatedSection) {
      return NextResponse.json({ message: "Navbar section not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Navbar section updated successfully", section: updatedSection });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to update navbar section" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req) => {
  await connectDB();

  try {
    const { id, active } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "Section id is required" }, { status: 400 });
    }

    const updatedSection = await NavbarSection.findOneAndUpdate(
        { _id: id, restaurant: req.restaurant }, 
        { active }, 
        { new: true }
    );

    if (!updatedSection) {
      return NextResponse.json({ message: "Navbar section not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Navbar section updated successfully", section: updatedSection });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to update navbar section" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req) => {
  await connectDB();

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "Section id is required" }, { status: 400 });
    }

    const deletedSection = await NavbarSection.findOneAndDelete({ _id: id, restaurant: req.restaurant });

    if (!deletedSection) {
      return NextResponse.json({ message: "Navbar section not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Navbar section deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to delete navbar section" }, { status: 500 });
  }
});