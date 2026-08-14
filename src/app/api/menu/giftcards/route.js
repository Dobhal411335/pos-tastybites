import { withAuth } from "@/utils/auth";
import Giftcard from "@/models/menu/Giftcard";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { sendGiftCardIssuedEmail } from "@/lib/brevo/sendGiftCardIssuedEmail";
import mongoose from "mongoose";

// Helper to generate a random code
const generateGiftCardCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed O, I, 0, 1

  const randomPart = (length) =>
    Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  return `TB-GC-${randomPart(4)}-${randomPart(4)}`;
};

// GET - List all giftcards grouped by batch
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const view = searchParams.get("view"); // 'flat' for all giftcards without batch grouping
    const code = searchParams.get("code");

    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      const purpose = searchParams.get("purpose") || "redeem";

      // Lookup unissued card for admin issue flow
      if (purpose === "issue") {
        const giftcard = await Giftcard.findOne({
          restaurant: request.restaurant,
          code: normalizedCode,
        });

        if (!giftcard) {
          return sendError(
            new Error("Not Found"),
            "Gift card with this code was not found",
            404,
          );
        }

        if (giftcard.isIssued) {
          return sendError(
            new Error("Already Issued"),
            "This gift card has already been issued",
            400,
          );
        }

        if (giftcard.status !== "Active") {
          return sendError(
            new Error("Inactive"),
            "This gift card is inactive",
            400,
          );
        }

        return sendSuccess(
          {
            _id: giftcard._id,
            code: giftcard.code,
            name: giftcard.name,
            value: giftcard.value,
            balance: giftcard.balance ?? giftcard.value,
            validFrom: giftcard.validFrom,
            validUntil: giftcard.validUntil,
            discountType: giftcard.discountType,
          },
          "Gift card is valid and ready to issue",
        );
      }

      const giftcard = await Giftcard.findOne({
        restaurant: request.restaurant,
        code: normalizedCode,
        isIssued: true,
        status: "Active",
      });
      if (!giftcard) {
        return sendError(
          new Error("Not Found"),
          "Gift card with this code was not found, not issued, or inactive",
          404
        );
      }

      const now = new Date();
      if (giftcard.validFrom && now < giftcard.validFrom) {
        return sendError(new Error("Not Yet Valid"), "This gift card is not valid yet", 400);
      }
      if (giftcard.validUntil && now > giftcard.validUntil) {
        return sendError(new Error("Expired"), "This gift card has expired", 400);
      }

      const currentBalance = giftcard.balance != null ? giftcard.balance : giftcard.value;
      if (currentBalance <= 0) {
        return sendError(new Error("Empty Balance"), "This gift card has no remaining balance", 400);
      }

      return sendSuccess(
        { ...giftcard.toObject(), balance: currentBalance },
        "Giftcard retrieved successfully"
      );
    }

    if (view === "flat") {
      const pipeline = [
        { $match: { restaurant: new mongoose.Types.ObjectId(request.restaurant), isIssued: true } },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            metadata: [{ $count: "total" }, { $addFields: { page } }],
            data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
          }
        }
      ];

      const result = await Giftcard.aggregate(pipeline);
      const metadata = result[0].metadata[0] || { total: 0, page };
      const data = result[0].data;

      return sendSuccess({
        giftcards: data,
        pagination: {
          total: metadata.total,
          page: metadata.page,
          limit,
          totalPages: Math.ceil(metadata.total / limit)
        }
      }, "Giftcards retrieved successfully");
    }

    // Aggregate by batchId (Default View)
    const pipeline = [
      { $match: { restaurant: new mongoose.Types.ObjectId(request.restaurant) } },
      {
        $group: {
          _id: "$batchId",
          name: { $first: "$name" },
          codes: { $push: "$code" },
          discountType: { $first: "$discountType" },
          value: { $first: "$value" },
          validFrom: { $first: "$validFrom" },
          validUntil: { $first: "$validUntil" },
          status: { $first: "$status" },
          count: { $sum: 1 },
          createdAt: { $first: "$createdAt" }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page } }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
        }
      }
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
}, ["ADMIN", "MANAGER", "STAFF", "EMPLOYEE"]);

// POST - Create one or multiple giftcards
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, discountType, value, validFrom, validUntil, count = 1, recipientName, recipientPhone, recipientEmail, issueDate, code } = data;

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
        code: (code && numToGenerate === 1) ? code : generateGiftCardCode(),
        name: name || "Gift Card",
        recipientName,
        recipientPhone,
        recipientEmail,
        issueDate: issueDate || new Date(),
        isIssued: !!recipientName || !!recipientEmail,
        discountType,
        value,
        balance: value,
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
    if (error.code === 11000) {
      return sendError(new Error("Duplicate Code"), "A gift card with this code already exists. Please use a different code.", 409);
    }
    logger.error("Failed to generate giftcards", error);
    return sendError(error, "Failed to generate giftcards", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PATCH - Issue an existing giftcard to a recipient
export const PATCH = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { code, value, recipientName, recipientPhone, recipientEmail, issueDate } = data;

    if (!code || !recipientName) {
      return sendError(new Error("Missing fields"), "Giftcard code and recipient name are required", 400);
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const giftcard = await Giftcard.findOne({
      restaurant: request.restaurant,
      code: normalizedCode,
    });

    if (!giftcard) {
      return sendError(new Error("Not Found"), "Gift card with this code was not found", 404);
    }

    if (giftcard.isIssued) {
      return sendError(new Error("Already Issued"), "This gift card has already been issued", 400);
    }

    if (value && Number(value) !== giftcard.value) {
      return sendError(new Error("Validation Error"), `The provided amount ($${value}) does not match the actual gift card amount ($${giftcard.value})`, 400);
    }

    giftcard.recipientName = recipientName;
    giftcard.recipientPhone = recipientPhone;
    giftcard.recipientEmail = recipientEmail?.trim() || "";
    giftcard.issueDate = issueDate || new Date();
    giftcard.isIssued = true;
    if (giftcard.balance == null) {
      giftcard.balance = giftcard.value;
    }

    await giftcard.save();

    let emailSent = false;
    if (recipientEmail?.trim()) {
      try {
        await sendGiftCardIssuedEmail({
          email: recipientEmail.trim(),
          recipientName,
          cardName: giftcard.name,
          code: giftcard.code,
          value: giftcard.value,
          issueDate: giftcard.issueDate,
          validFrom: giftcard.validFrom,
          validUntil: giftcard.validUntil,
        });
        emailSent = true;
      } catch (emailErr) {
        logger.error(`Gift card issued but email failed for ${normalizedCode}`, emailErr);
      }
    }

    logger.info(`Issued giftcard ${normalizedCode} to ${recipientName}`);
    return sendSuccess(
      { ...giftcard.toObject(), emailSent },
      emailSent
        ? `Successfully issued gift card to ${recipientName} and sent email`
        : `Successfully issued gift card to ${recipientName}`,
    );
  } catch (error) {
    logger.error("Failed to issue giftcard", error);
    return sendError(error, "Failed to issue gift card", 500);
  }
}, ["ADMIN", "MANAGER"]);
