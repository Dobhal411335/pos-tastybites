import { withAuth } from "@/utils/auth";
import StockProduct from "@/models/stock/StockProduct";
import StockIn from "@/models/stock/StockIn";
import StockOut from "@/models/stock/StockOut";
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - Get aggregated stock levels
export const GET = withAuth(async (request) => {
  try {
    const restaurant = request.restaurant;
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get("category");

    let query = { restaurant };
    if (categoryFilter && categoryFilter !== "all") {
      query.category = categoryFilter;
    }

    // 1. Fetch products
    const products = await StockProduct.find(query)
      .populate('category', 'name')
      .populate('unit', 'name')
      .lean();

    // 2. Fetch all In/Out transactions for this restaurant
    const [allIns, allOuts] = await Promise.all([
      StockIn.find({ restaurant }).lean(),
      StockOut.find({ restaurant }).lean()
    ]);

    // 3. Aggregate totals
    const levels = products.map(product => {
      const prodIns = allIns.filter(i => i.product.toString() === product._id.toString());
      const prodOuts = allOuts.filter(o => o.product.toString() === product._id.toString());

      const totalIn = prodIns.reduce((sum, i) => sum + i.quantity, 0);
      const totalOut = prodOuts.reduce((sum, o) => sum + o.quantity, 0);
      const currentBalance = totalIn - totalOut;

      return {
        _id: product._id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        status: product.status,
        purchasePrice: product.purchasePrice,
        salePrice: product.salePrice,
        totalIn,
        totalOut,
        currentBalance
      };
    });

    return sendSuccess(levels, "Stock levels retrieved successfully");
  } catch (error) {
    logger.error("Failed to calculate stock levels", error);
    return sendError(error, "Failed to retrieve stock levels", 500);
  }
}, ["ADMIN", "MANAGER"]);
