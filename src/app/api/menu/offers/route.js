import { withAuth } from "@/utils/auth";
import Offer from "@/models/menu/Offer";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all offers for the restaurant
export const GET = withAuth(async (request) => {
  try {
    const offers = await Offer.find({ restaurant: request.restaurant })
      .sort({ createdAt: -1 })
      .lean();
    return sendSuccess(offers, "Offers retrieved successfully");
  } catch (error) {
    logger.error("Failed to list offers", error);
    return sendError(error, "Failed to retrieve offers", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new promotional offer
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, price, description, inclusions, choices, drinks, validFrom, validTo, image } = data;

    if (!name || price === undefined) {
      return sendError(new Error("Missing fields"), "Name and Price are required", 400);
    }

    const newOffer = await Offer.create({
      restaurant: request.restaurant,
      name,
      price: Number(price) || 0,
      description: description || "",
      inclusions: inclusions || [],
      choices: choices || [],
      drinks: drinks || [],
      validFrom: validFrom ? new Date(validFrom) : null,
      validTo: validTo ? new Date(validTo) : null,
      image: image || {},
      status: true,
      createdBy: request.user.id
    });

    logger.info(`Offer created: ${name}`);
    return sendSuccess(newOffer, "Offer created successfully", 201);
  } catch (error) {
    logger.error("Failed to create offer", error);
    return sendError(error, "Failed to create offer", 500);
  }
}, ["ADMIN", "MANAGER"]);
