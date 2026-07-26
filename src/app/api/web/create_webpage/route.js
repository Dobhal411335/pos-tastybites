import connectDB from "@/lib/db";
import Webpage from "@/models/Web/Webpage";
import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";
import { deleteImage } from "@/lib/cloudinary/deleteImage";

const ALLOWED_TEMPLATE_TYPES = new Set(["design1", "design2", "design3", "design4", "design5", "design6", "design7"]);

const sanitizeTemplateType = (templateType) => {
  if (ALLOWED_TEMPLATE_TYPES.has(templateType)) return templateType;
  return "design1";
};

export const GET = withAuth(async (req) => {
  try {
    await connectDB();
    const webpages = await Webpage.find({ restaurant: req.restaurant }).sort({ createdAt: -1 });
    return NextResponse.json(webpages, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch webpages", message: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    await connectDB();
    const body = await request.json();
    const title = (body.title || "").trim();
    const slug = (body.slug || "").trim().toLowerCase();

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
    }

    const existing = await Webpage.findOne({ slug, restaurant: request.restaurant });
    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }

    const webpage = await Webpage.create({
      restaurant: request.restaurant,
      title,
      slug,
      active: typeof body.active === "boolean" ? body.active : true,
      templateType: sanitizeTemplateType(body.templateType),
    });

    return NextResponse.json(webpage, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create webpage", message: error.message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request) => {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Webpage id is required" }, { status: 400 });
    }

    const update = {};

    if (typeof body.title === "string") update.title = body.title.trim();
    if (typeof body.slug === "string") update.slug = body.slug.trim().toLowerCase();
    if (typeof body.active === "boolean") update.active = body.active;
    if (typeof body.templateType === "string") update.templateType = sanitizeTemplateType(body.templateType);

    const updated = await Webpage.findOneAndUpdate(
      { _id: body.id, restaurant: request.restaurant },
      update, 
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Webpage not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update webpage", message: error.message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request) => {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Webpage id is required" }, { status: 400 });
    }

    const webpage = await Webpage.findOne({ _id: body.id, restaurant: request.restaurant });
    if (!webpage) {
      return NextResponse.json({ error: "Webpage not found or unauthorized" }, { status: 404 });
    }

    // Collect all image keys to delete from Cloudinary
    const imageKeys = new Set();
    const addKey = (img) => {
      if (img && img.key && typeof img.key === 'string' && img.key.trim() !== '') {
        imageKeys.add(img.key);
      }
    };

    // Check top-level image fields
    addKey(webpage.imageFirst);
    addKey(webpage.bannerImage);
    addKey(webpage.mainProfileImage);
    addKey(webpage.paragraphFirstImage);
    addKey(webpage.paragraphSecondImage);
    addKey(webpage.advertisementImage);
    addKey(webpage.sideThumbImage);

    // Check arrays
    if (Array.isArray(webpage.imageGallery)) {
      webpage.imageGallery.forEach(addKey);
    }
    if (Array.isArray(webpage.paragraphSections)) {
      webpage.paragraphSections.forEach(sec => {
        addKey(sec.firstImage);
        addKey(sec.secondImage);
      });
    }
    if (Array.isArray(webpage.gridCards)) {
      webpage.gridCards.forEach(card => {
        addKey(card.image);
        if (Array.isArray(card.bentoImages)) {
          card.bentoImages.forEach(addKey);
        }
      });
    }
    if (Array.isArray(webpage.teamCards)) {
      webpage.teamCards.forEach(card => {
        addKey(card.image);
      });
    }

    // Delete images from Cloudinary
    for (const key of imageKeys) {
      try {
        await deleteImage(key);
      } catch (err) {
        console.error(`Failed to delete Cloudinary image with key ${key}:`, err);
      }
    }

    await Webpage.findByIdAndDelete(body.id);
    
    return NextResponse.json({ message: "Webpage deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete webpage", message: error.message }, { status: 500 });
  }
});
