import connectDB from "@/lib/db";
import Webpage from "@/models/Web/Webpage";
import { NextResponse } from "next/server";

const ALLOWED_TEMPLATE_TYPES = new Set(["design1", "design2", "design3", "design4", "design5", "design6", "design7"]);

const sanitizeTemplateType = (templateType) => {
  if (ALLOWED_TEMPLATE_TYPES.has(templateType)) return templateType;
  return "design1";
};

const slugify = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const generateUniqueGallerySlug = async (sourceName) => {
  const baseSlug = slugify(sourceName);
  if (!baseSlug) return "";
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await Webpage.findOne({ "gridCards.gallerySlug": slug });
    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const ALLOWED_UPDATE_FIELDS = new Set([
  "title",
  "slug",
  "active",
  "templateType",
  "firstTitle",
  "imageFirst",
  "bannerImage",
  "secondTitle",
  "createTags",
  "postedBy",
  "highlights",
  "paragraphSections",
  "paragraphFirstImage",
  "paragraphSecondImage",
  "tableTitle",
  "tableRows",
  "blockquoteMainTitle",
  "blockquoteLeftTitle",
  "blockquoteDescription",
  "blockquoteTags",
  "accordionTags",
  "advertisementImage",
  "advertisementUrl",
  "sideThumbImage",
  "sideThumbName",
  "sideThumbDesignation",
  "sideThumbDescription",
  "facebookUrl",
  "youtubeUrl",
  "instaUrl",
  "googleUrl",
  "mainProfileImage",
  "imageGallery",
  "section",
  "notices",
  "boldParagraph",
  "searchLocations",
  "design5Chip",
  "design5MainHeading",
  "gridCards",
  "design6Chip",
  "design6ExploreLink",
  "design6MainHeading",
  "design6SubHeading",
  "design6Author",
  "design6MidHeading",
  "design6MidLink",
  "teamCards",
  "design7Chip",
  "design7ExploreLink",
  "design7MainHeading",
]);

export async function GET(_request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const webpage = await Webpage.findById(id);
    if (!webpage) {
      return NextResponse.json({ error: "Webpage not found" }, { status: 404 });
    }

    return NextResponse.json(webpage, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch webpage", message: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const update = {};
    Object.keys(body || {}).forEach((key) => {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        update[key] = body[key];
      }
    });

    if (typeof body.templateType === "string") {
      update.templateType = sanitizeTemplateType(body.templateType);
    }

    if (typeof body.slug === "string") {
      update.slug = body.slug.trim().toLowerCase();
    }

    if (typeof body.title === "string") {
      update.title = body.title.trim();
    }

    if (body.sideThumbImage && typeof body.sideThumbImage === "object") {
      update.sideThumbImage = {
        url: body.sideThumbImage.url || "",
        key: body.sideThumbImage.key || body.sideThumbImageKey || "",
      };
    }

    if (typeof body.sideThumbImage === "string") {
      update.sideThumbImage = {
        url: body.sideThumbImage,
        key: body.sideThumbImageKey || "",
      };
    }

    if (update.gridCards && Array.isArray(update.gridCards)) {
      for (let i = 0; i < update.gridCards.length; i++) {
        const card = update.gridCards[i];
        if (card.title && !card.gallerySlug) {
          card.gallerySlug = await generateUniqueGallerySlug(card.title);
        }
      }
    }

    const updated = await Webpage.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Webpage not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update webpage", message: error.message }, { status: 500 });
  }
}
