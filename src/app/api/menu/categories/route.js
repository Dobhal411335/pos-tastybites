import { withAuth } from "@/utils/auth";
import Category from "@/models/menu/Category";
import Product from "@/models/menu/Product";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all categories with product counts
export const GET = withAuth(async (request) => {
  try {
    const categories = await Category.find({ restaurant: request.restaurant }).sort({ createdAt: -1 }).lean();
    
    // Get product counts per category
    const categoryIds = categories.map(c => c._id);
    const productCounts = await Product.aggregate([
      { $match: { category: { $in: categoryIds }, restaurant: request.restaurant } },
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
}, ["ADMIN", "MANAGER"]);

// POST - Create a new category
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return sendError(new Error("Missing name"), "Category name is required", 400);
    }

    const newCategory = await Category.create({
      restaurant: request.restaurant,
      name,
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
    const { _id, name, status } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Category ID is required", 400);
    }

    const updateData = { updatedBy: request.user.id };
    if (name) updateData.name = name;
    if (status) updateData.status = status;

    const updatedCategory = await Category.findOneAndUpdate(
      { _id, restaurant: request.restaurant },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return sendError(new Error("Not Found"), "Category not found", 404);
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

    // Optional: check if there are products using this category
    const productsCount = await Product.countDocuments({ category: id, restaurant: request.restaurant });
    if (productsCount > 0) {
      return sendError(new Error("Category in use"), "Cannot delete category because it contains products.", 400);
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
