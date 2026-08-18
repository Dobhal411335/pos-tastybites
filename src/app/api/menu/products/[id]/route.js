import { withAuth } from "@/utils/auth";
import Product from "@/models/menu/Product";
import Category from "@/models/menu/Category";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { deleteImage } from "@/lib/cloudinary/deleteImage";
import Tax from "@/models/tax/Tax";
import { markCategoryAddons, mergeAddons, normalizeAddons } from "@/lib/menu/addons";
// GET - Get single product details
export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return sendError(new Error("Missing ID"), "Product ID is required", 400);
    }

    const product = await Product.findOne({ _id: id, restaurant: request.restaurant })
      .populate("category", "name addons")
      .populate("taxes")
      .lean();

    if (!product) {
      return sendError(new Error("Not Found"), "Product not found", 404);
    }

    product.addons = markCategoryAddons(product.addons || [], product.category?.addons || []);

    return sendSuccess(product, "Product retrieved successfully");
  } catch (error) {
    logger.error(`Failed to get product ${params?.id}`, error);
    return sendError(error, "Failed to retrieve product details", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update full product details
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return sendError(new Error("Missing ID"), "Product ID is required", 400);
    }

    const data = await request.json();
    // Allow updating basic info, description, taxes, status, variants, addons, image, discount
    const { name, category, productCode, productType, description, taxes, status, variants, addons, image, preparationStyles, choiceOptions } = data;

    const updateData = { updatedBy: request.user.id };

    if (productType !== undefined) {
      const normalizedType = String(productType).toUpperCase();
      if (!["KITCHEN", "BAR"].includes(normalizedType)) {
        return sendError(new Error("Invalid productType"), "Product type must be KITCHEN or BAR", 400);
      }
      updateData.productType = normalizedType;
    }
    
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) {
      updateData.category = category;
      const nextCategory = await Category.findOne({ _id: category, restaurant: request.restaurant }).lean();
      if (nextCategory?.addons?.length) {
        const current = await Product.findOne({ _id: id, restaurant: request.restaurant }).select("addons").lean();
        updateData.addons = mergeAddons(addons || current?.addons || [], normalizeAddons(nextCategory.addons));
      }
    }
    if (productCode !== undefined) updateData.productCode = productCode;
    if (description !== undefined) updateData.description = description;
    if (taxes !== undefined) {
      updateData.taxes = taxes;
      const activeTaxes = await Tax.find({ _id: { $in: taxes }, restaurant: request.restaurant });
      let totalPercentage = 0;
      let totalFixed = 0;
      const taxNames = [];
      activeTaxes.forEach(t => {
        taxNames.push(t.name);
        if (t.type === "percent" || t.type === "Percent") totalPercentage += t.value;
        else totalFixed += t.value;
      });
      updateData.taxData = { totalPercentage, totalFixed, taxNames };
    }
    if (status) updateData.status = status;
    if (variants) updateData.variants = variants;
    if (addons) updateData.addons = addons;
    if (image !== undefined) updateData.image = image;
    if (preparationStyles !== undefined) updateData.preparationStyles = preparationStyles;
    if (choiceOptions !== undefined) {
      updateData.choiceOptions = (Array.isArray(choiceOptions) ? choiceOptions : [])
        .map((group) => ({
          name: String(group?.name || "").trim(),
          subChoices: (Array.isArray(group?.subChoices) ? group.subChoices : [])
            .map((value) => String(value || "").trim())
            .filter(Boolean),
        }))
        .filter((group) => group.name && group.subChoices.length > 0);
    }

    const updateObj = { $set: updateData };
    if (data.discount === null) {
      updateObj.$unset = { discount: 1, discountActive: 1 };
    } else if (data.discount !== undefined) {
      updateObj.$set.discount = data.discount;
      updateObj.$set.discountActive = true;
    }
    if (data.discountActive !== undefined) {
      updateObj.$set.discountActive = data.discountActive;
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      updateObj,
      { returnDocument: 'after', runValidators: true }
    ).populate("category", "name").populate("taxes");

    if (!updatedProduct) {
      return sendError(new Error("Not Found"), "Product not found", 404);
    }

    logger.info(`Product updated: ${id}`);
    return sendSuccess(updatedProduct, "Product updated successfully");
  } catch (error) {
    logger.error(`Failed to update product ${params?.id}`, error);
    return sendError(error, "Failed to update product details", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove product
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;

    if (!id) {
      return sendError(new Error("Missing ID"), "Product ID is required", 400);
    }

    const product = await Product.findOne({ _id: id, restaurant: request.restaurant });
    if (!product) {
      return sendError(new Error("Not Found"), "Product not found", 404);
    }

    if (product.image?.key) {
      try { await deleteImage(product.image.key); } catch (e) { logger.error("Cloudinary delete error", e); }
    }

    await Product.findOneAndDelete({ _id: id, restaurant: request.restaurant });

    logger.info(`Product deleted: ${id}`);
    return sendSuccess(null, "Product deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete product ${params?.id}`, error);
    return sendError(error, "Failed to delete product", 500);
  }
}, ["ADMIN", "MANAGER"]);


