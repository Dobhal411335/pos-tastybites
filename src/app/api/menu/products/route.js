import { withAuth } from "@/utils/auth";
import Product from "@/models/menu/Product";
import Category from "@/models/menu/Category";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import Coupon from "@/models/menu/Coupon";
import Tax from "@/models/tax/Tax";
import { normalizeAddons } from "@/lib/menu/addons";
// GET - List all products
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly =
      searchParams.get("active") === "1" ||
      searchParams.get("status") === "Active";

    const query = { restaurant: request.restaurant };
    if (activeOnly) {
      query.status = "Active";
      const activeCategories = await Category.find({
        restaurant: request.restaurant,
        status: "Active",
      })
        .select("_id")
        .lean();
      query.category = { $in: activeCategories.map((c) => c._id) };
    }

    const products = await Product.find(query)
      .populate("category", "name status")
      .populate("discount")
      .populate("taxes")
      .lean();

    return sendSuccess(products, "Products retrieved successfully");
  } catch (error) {
    logger.error("Failed to list products", error);
    return sendError(error, "Failed to retrieve products", 500);
  }
});

// POST - Create a new product (basic info)
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { names, codes, categoryId } = data;

    if (!names || !Array.isArray(names) || names.length === 0 || !categoryId) {
      return sendError(new Error("Missing fields"), "Product names and category are required", 400);
    }

    const category = await Category.findOne({ _id: categoryId, restaurant: request.restaurant });
    if (!category) {
      return sendError(new Error("Invalid Category"), "Selected category does not exist", 404);
    }

    const activeTaxes = await Tax.find({ restaurant: request.restaurant, status: "Active" });
    const taxIds = activeTaxes.map(t => t._id);
    let totalPercentage = 0;
    let totalFixed = 0;
    const taxNames = [];
    activeTaxes.forEach(t => {
      taxNames.push(t.name);
      if (t.type === "percent" || t.type === "Percent") totalPercentage += t.value;
      else totalFixed += t.value;
    });

    const categoryAddons = normalizeAddons(category.addons || []);

    const productsToCreate = names.map((name, index) => ({
      restaurant: request.restaurant,
      category: categoryId,
      name: name.trim(),
      productCode: codes && codes[index] ? codes[index].trim() : "",
      productType: "KITCHEN",
      status: "Active",
      addons: categoryAddons,
      taxes: taxIds,
      taxData: {
        totalPercentage,
        totalFixed,
        taxNames
      },
      createdBy: request.user.id
    }));

    const newProducts = await Product.insertMany(productsToCreate);

    logger.info(`Products created: ${names.join(", ")}`);
    return sendSuccess(newProducts, "Products created successfully", 201);
  } catch (error) {
    logger.error("Failed to create product", error);
    return sendError(error, "Failed to create product", 500);
  }
}, ["ADMIN", "MANAGER"]);
