import { withAuth } from "@/utils/auth";
import Category from "@/models/menu/Category";
import Product from "@/models/menu/Product";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";
import { mergeAddons, normalizeAddons } from "@/lib/menu/addons";

async function syncCategoryAddonsToProducts(restaurantId, categoryId, categoryAddons) {
  const incoming = normalizeAddons(categoryAddons);
  if (incoming.length === 0) return;

  const products = await Product.find({ category: categoryId, restaurant: restaurantId });
  await Promise.all(
    products.map(async (product) => {
      product.addons = mergeAddons(product.addons || [], incoming);
      await product.save();
    })
  );
}

// GET - List all categories with product counts
export const GET = withAuth(async (request) => {
  try {
    const categories = await Category.find({ restaurant: request.restaurant }).lean();

    // Get product counts per category
    const categoryIds = categories.map(c => c._id);
    const productCounts = await Product.aggregate([
      { $match: { category: { $in: categoryIds }, restaurant: new mongoose.Types.ObjectId(request.restaurant) } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    productCounts.forEach(pc => {
      countMap[pc._id.toString()] = pc.count;
    });

    const data = categories.map(c => ({
      ...c,
      items: countMap[c._id.toString()] || 0
    }));

    return sendSuccess(data, "Categories retrieved successfully");
  } catch (error) {
    logger.error("Failed to list categories", error);
    return sendError(error, "Failed to retrieve categories", 500);
  }
});

// POST - Create a new category
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, addons } = data;

    if (!name) {
      return sendError(new Error("Missing name"), "Category name is required", 400);
    }

    const newCategory = await Category.create({
      restaurant: request.restaurant,
      name,
      addons: normalizeAddons(addons),
      status: "Active",
      createdBy: request.user.id
    });

    logger.info(`Category created: ${name}`);
    return sendSuccess(newCategory, "Category created successfully", 201);
  } catch (error) {
    logger.error("Failed to create category", error);
    return sendError(error, "Failed to create category", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update category
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, name, status, addons } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Category ID is required", 400);
    }

    const updateData = { updatedBy: request.user.id };
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (addons !== undefined) updateData.addons = normalizeAddons(addons);

    const updatedCategory = await Category.findOneAndUpdate(
      { _id, restaurant: request.restaurant },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return sendError(new Error("Not Found"), "Category not found", 404);
    }

    if (addons !== undefined) {
      await syncCategoryAddonsToProducts(request.restaurant, _id, updatedCategory.addons);
    }

    logger.info(`Category updated: ${_id}`);
    return sendSuccess(updatedCategory, "Category updated successfully");
  } catch (error) {
    logger.error("Failed to update category", error);
    return sendError(error, "Failed to update category", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove category
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Category ID is required", 400);
    }

    const productsCount = await Product.countDocuments({ category: id, restaurant: request.restaurant });
    if (productsCount > 0) {
      return sendError(new Error("Category in use"), "Please delete all products in this category before deleting the category itself.", 409);
    }

    const deleted = await Category.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    
    if (!deleted) {
      return sendError(new Error("Not Found"), "Category not found", 404);
    }

    logger.info(`Category deleted: ${id}`);
    return sendSuccess(null, "Category deleted successfully");
  } catch (error) {
    logger.error("Failed to delete category", error);
    return sendError(error, "Failed to delete category", 500);
  }
}, ["ADMIN", "MANAGER"]);
