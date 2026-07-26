import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import Giftcard from "@/models/menu/Giftcard";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// POST - Create a new admin order
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { items, subTotal, taxTotal, discountTotal, discountCode, giftcardCode, giftcardUsedAmount, totalAmount, specialNote, orderNumber } = data;

    if (!items || items.length === 0) {
      return sendError(new Error("Empty cart"), "Cart cannot be empty", 400);
    }
    
    const newOrder = await Order.create({
      restaurantId: request.restaurant,
      orderNumber,
      items: items.map(item => ({
        menuItemId: item.id,
        name: item.name,
        size: item.size || "Standard",
        qty: item.qty,
        price: item.price,
        tax: item.tax || 0,
        options: item.options || []
      })),
      subTotal: Number(subTotal) || 0,
      taxTotal: Number(taxTotal) || 0,
      discountTotal: Number(Number(discountTotal).toFixed(2)) || 0,
      discountCode: discountCode || null,
      giftcardCode: giftcardCode || null,
      giftcardUsedAmount: Number(Number(giftcardUsedAmount).toFixed(2)) || 0,
      totalAmount: Number(Number(totalAmount).toFixed(2)) || 0,
      specialNote: specialNote,
      guestName: "Admin (Direct)",
      status: "PENDING",
      source: "ADMIN",
      processedBy: request.user.id
    });

    if (giftcardCode && giftcardUsedAmount > 0) {
      const giftcard = await Giftcard.findOne({ code: giftcardCode, restaurant: request.restaurant });
      if (giftcard) {
        // Fallback to value if balance is undefined
        const currentBalance = giftcard.balance !== undefined ? giftcard.balance : giftcard.value;
        const newBalance = Math.max(0, currentBalance - giftcardUsedAmount);
        
        giftcard.balance = newBalance;
        if (newBalance === 0) {
          giftcard.status = "Inactive";
        }
        await giftcard.save();
      }
    }

    logger.info(`Admin Order created: ${orderNumber}`);
    return sendSuccess(newOrder, "Admin order placed successfully", 201);

  } catch (error) {
    logger.error("Failed to place admin order", error);
    return sendError(error, "Failed to place order", 500);
  }
}, ["ADMIN", "MANAGER"]);

// GET - List today's admin orders
export const GET = withAuth(async (request) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      restaurantId: request.restaurant,
      source: "ADMIN",
      createdAt: { $gte: startOfToday }
    }).sort({ createdAt: -1 });

    return sendSuccess(orders, "Admin orders fetched successfully");
  } catch (error) {
    logger.error("Failed to fetch admin orders", error);
    return sendError(error, "Failed to fetch orders", 500);
  }
}, ["ADMIN", "MANAGER"]);
