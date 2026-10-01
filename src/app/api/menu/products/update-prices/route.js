import { withAuth } from "@/utils/auth";
import Product from "@/models/menu/Product";
import Category from "@/models/menu/Category";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

function applyPercentToPrice(price, percent) {
  // Work in integer cents to avoid float drift, then round once.
  // Increase: multiply by (1 + p/100). Decrease: divide by (1 + |p|/100)
  // so +10% then -10% restores the prior price (e.g. 2.75 → 3.03 → 2.75).
  const cents = Math.round((Number(price) || 0) * 100);
  const factor = 1 + Math.abs(Number(percent)) / 100;
  if (!Number.isFinite(factor) || factor <= 0) return Math.max(0, cents / 100);

  const nextCents =
    percent > 0
      ? Math.round(cents * factor)
      : Math.round(cents / factor);

  return Math.max(0, nextCents / 100);
}

// POST - Increase or decrease variant prices by percent (category-wide or single product)
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { percent, mode, categoryId, productId } = data;

    const percentValue = Number(percent);
    if (!Number.isFinite(percentValue) || percentValue === 0) {
      return sendError(
        new Error("Invalid percent"),
        "A non-zero percent value is required",
        400
      );
    }

    if (mode !== "category" && mode !== "product") {
      return sendError(
        new Error("Invalid mode"),
        "Mode must be 'category' or 'product'",
        400
      );
    }

    if (!categoryId) {
      return sendError(
        new Error("Missing category"),
        "Category is required",
        400
      );
    }

    if (mode === "product" && !productId) {
      return sendError(
        new Error("Missing product"),
        "Product is required for single-product updates",
        400
      );
    }

    const category = await Category.findOne({
      _id: categoryId,
      restaurant: request.restaurant,
    }).lean();

    if (!category) {
      return sendError(new Error("Invalid Category"), "Category not found", 404);
    }

    const query = {
      restaurant: request.restaurant,
      category: categoryId,
    };

    if (mode === "product") {
      query._id = productId;
    }

    const products = await Product.find(query).select("name variants").lean();

    if (mode === "product" && products.length === 0) {
      return sendError(new Error("Invalid Product"), "Product not found", 404);
    }

    if (products.length === 0) {
      return sendSuccess(
        { updatedCount: 0, productsAffected: 0, skippedCount: 0 },
        "No products found in this category",
        200
      );
    }

    const ops = [];
    let skippedCount = 0;

    for (const product of products) {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      if (variants.length === 0) {
        skippedCount += 1;
        continue;
      }

      const nextVariants = variants.map((variant) => ({
        ...variant,
        price: applyPercentToPrice(variant.price, percentValue),
      }));

      ops.push({
        updateOne: {
          filter: { _id: product._id, restaurant: request.restaurant },
          update: {
            $set: {
              variants: nextVariants,
              updatedBy: request.user.id,
            },
          },
        },
      });
    }

    let updatedCount = 0;
    if (ops.length > 0) {
      const result = await Product.bulkWrite(ops);
      updatedCount = result.modifiedCount ?? ops.length;
    }

    logger.info(
      `Price update ${percentValue}% (${mode}) on category ${categoryId}: ${updatedCount} updated, ${skippedCount} skipped`
    );

    return sendSuccess(
      {
        updatedCount,
        productsAffected: updatedCount,
        skippedCount,
        percent: percentValue,
        mode,
      },
      `Updated prices on ${updatedCount} product(s)`,
      200
    );
  } catch (error) {
    logger.error("Failed to update product prices", error);
    return sendError(error, "Failed to update product prices", 500);
  }
}, ["ADMIN", "MANAGER"]);
