import { withAuth } from "@/utils/auth";
import Giftcard from "@/models/menu/Giftcard";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

// Helper to generate a random code
const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "GIFT-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) code += "-";
  }
  return code;
};

// GET - List all giftcards grouped by batch
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    
    // Aggregate by batchId
    const pipeline = [
      { $match: { restaurant: new mongoose.Types.ObjectId(request.restaurant) } },
      { $group: {
          _id: "$batchId",
          name: { $first: "$name" },
          discountType: { $first: "$discountType" },
          value: { $first: "$value" },
          validFrom: { $first: "$validFrom" },
          validUntil: { $first: "$validUntil" },
          status: { $first: "$status" },
          count: { $sum: 1 },
          createdAt: { $first: "$createdAt" }
      }},
      { $sort: { createdAt: -1 } },
      { $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page } }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
      }}
    ];

    const result = await Giftcard.aggregate(pipeline);
    const metadata = result[0].metadata[0] || { total: 0, page };
    const data = result[0].data;

    return sendSuccess({
      batches: data,
      pagination: {
        total: metadata.total,
        page: metadata.page,
        limit,
        totalPages: Math.ceil(metadata.total / limit)
      }
    }, "Giftcard batches retrieved successfully");
  } catch (error) {
    logger.error("Failed to list giftcards", error);
    return sendError(error, "Failed to retrieve giftcards", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create one or multiple giftcards
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, discountType, value, validFrom, validUntil, count = 1 } = data;

    if (!discountType || !value) {
      return sendError(new Error("Missing fields"), "Discount type and value are required", 400);
    }

    const numToGenerate = parseInt(count);
    if (isNaN(numToGenerate) || numToGenerate < 1 || numToGenerate > 100) {
      return sendError(new Error("Invalid Count"), "Count must be between 1 and 100", 400);
    }

    const batchId = new mongoose.Types.ObjectId().toString();
    const giftcardsToInsert = [];
    for (let i = 0; i < numToGenerate; i++) {
      giftcardsToInsert.push({
        restaurant: request.restaurant,
        batchId,
        code: generateCode(),
        name: name || "Gift Card",
        discountType,
        value,
        validFrom,
        validUntil,
        status: "Active",
        createdBy: request.user.id
      });
    }

    const createdGiftcards = await Giftcard.insertMany(giftcardsToInsert);

    logger.info(`Generated ${numToGenerate} giftcard(s) in batch ${batchId}`);
    return sendSuccess(createdGiftcards, `Successfully generated ${numToGenerate} giftcard(s)`, 201);
  } catch (error) {
    logger.error("Failed to generate giftcards", error);
    return sendError(error, "Failed to generate giftcards", 500);
  }
}, ["ADMIN", "MANAGER"]);
