import StockProduct from "@/models/stock/StockProduct";
import StockIn from "@/models/stock/StockIn";
import StockOut from "@/models/stock/StockOut";
import Restaurant from "@/models/Restaurant";
import StockCategory from "@/models/stock/StockCategory";
import StockType from "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { sumStockInQuantityForProduct } from "@/lib/stock/normalizeStockIn";

export async function getStockLevels({ restaurantId, category, type }) {
  const query = { restaurant: restaurantId };
  if (category && category !== "all") query.category = category;
  if (type && type !== "all") query.type = type;

  const [products, allIns, allOuts, restaurant] = await Promise.all([
    StockProduct.find(query)
      .populate("category", "name")
      .populate("type", "name")
      .populate("unit", "name")
      .lean(),
    StockIn.find({ restaurant: restaurantId }).lean(),
    StockOut.find({ restaurant: restaurantId }).lean(),
    Restaurant.findById(restaurantId).select("name email").lean(),
  ]);

  const levels = products.map((product) => {
    const pid = product._id.toString();
    const openingStock = Number(product.openingStock) || 0;
    const totalIn = sumStockInQuantityForProduct(allIns, pid);
    const totalOut = allOuts
      .filter((o) => o.product?.toString() === pid)
      .reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
    const currentBalance = openingStock + totalIn - totalOut;

    return {
      _id: product._id,
      name: product.name,
      category: product.category,
      type: product.type,
      unit: product.unit,
      status: product.status,
      purchasePrice: product.purchasePrice,
      openingStock,
      totalIn,
      totalOut,
      currentBalance,
    };
  });

  return {
    levels,
    restaurantName: restaurant?.name || "Tasty Bites",
    restaurantEmail: restaurant?.email || "",
  };
}

export async function getStockFilterLabels(restaurantId, category, type) {
  let categoryLabel = "All";
  let typeLabel = "All";
  if (category && category !== "all") {
    const cat = await StockCategory.findOne({
      _id: category,
      restaurant: restaurantId,
    })
      .select("name")
      .lean();
    if (cat?.name) categoryLabel = cat.name;
  }
  if (type && type !== "all") {
    const t = await StockType.findOne({ _id: type, restaurant: restaurantId })
      .select("name")
      .lean();
    if (t?.name) typeLabel = t.name;
  }
  return { categoryLabel, typeLabel };
}
