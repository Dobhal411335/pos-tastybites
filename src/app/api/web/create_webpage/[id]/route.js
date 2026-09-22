import connectDB from "@/lib/db";
import Webpage from "@/models/Web/Webpage";
import { NextResponse } from "next/server";
import { withAuth } from "@/utils/auth";

const ALLOWED_TEMPLATE_TYPES = new Set(["design1", "design2", "design3", "design4", "design5", "design6", "design7", "design8", "design9"]);

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

const sanitizeTeamCards = (cards) => {
  if (!Array.isArray(cards)) return [];
  return cards.map((card) => ({
    image: {
      url: card?.image?.url || "",
      key: card?.image?.key || "",
    },
    name: String(card?.name || "").trim(),
    designation: String(card?.designation || "").trim(),
    qualification: String(card?.qualification || "").trim(),
    specialization: String(card?.specialization || "").trim(),
    phone: String(card?.phone || "").trim(),
    facebook: String(card?.facebook || "").trim(),
    instagram: String(card?.instagram || "").trim(),
    youtube: String(card?.youtube || "").trim(),
  }));
};

const sanitizeStringList = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item || "").trim()).filter(Boolean);
};

const sanitizeDesign9Cards = (cards) => {
  if (!Array.isArray(cards)) return [];
  return cards.map((card) => ({
    heading: String(card?.heading || "").trim(),
    description: String(card?.description || ""),
    images: Array.isArray(card?.images)
      ? card.images.map((img) => ({
          url: img?.url || "",
          key: img?.key || "",
        }))
      : [],
  }));
};

const ALLOWED_UPDATE_FIELDS = new Set([
  "title",
  "slug",
  "active",
  "titleLine",
  "keywords",
  "templateType",
  "firstTitle",
  "imageFirst",
  "imageFirstMobile",
  "bannerImage",
  "bannerImageMobile",
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
  "advertisements",
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
  "design8Heading",
  "design8Description",
  "design8HotelAmenities",
  "design8RoomDescription",
  "design8RoomAmenities",
  "design9MiniHeading",
  "design9MainHeading",
  "design9Description",
  "design9Cards",
]);

export const GET = withAuth(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = await params;

    const webpage = await Webpage.findOne({
      _id: id,
      restaurant: request.restaurant,
    });
    if (!webpage) {
      return NextResponse.json({ error: "Webpage not found" }, { status: 404 });
    }

    return NextResponse.json(webpage, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch webpage", message: error.message },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request, { params }) => {
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

    if (typeof body.titleLine === "string") {
      update.titleLine = body.titleLine.trim();
    }

    if (Array.isArray(body.keywords)) {
      update.keywords = body.keywords
        .map((k) => String(k || "").trim())
        .filter(Boolean);
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

    if (Array.isArray(body.teamCards)) {
      update.teamCards = sanitizeTeamCards(body.teamCards);
    }

    if (Array.isArray(body.design8HotelAmenities)) {
      update.design8HotelAmenities = sanitizeStringList(
        body.design8HotelAmenities
      );
    }

    if (Array.isArray(body.design8RoomAmenities)) {
      update.design8RoomAmenities = sanitizeStringList(
        body.design8RoomAmenities
      );
    }

    if (Array.isArray(body.design9Cards)) {
      update.design9Cards = sanitizeDesign9Cards(body.design9Cards);
    }

    const updated = await Webpage.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      update,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return NextResponse.json({ error: "Webpage not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update webpage", message: error.message },
      { status: 500 }
    );
  }
});
