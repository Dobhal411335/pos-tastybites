import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getStockLevels, getStockFilterLabels } from "@/lib/stock/getStockLevels";
import { exportStockLevelExcel } from "@/lib/stock/exportStockLevelExcel";
import { exportStockLevelPdf } from "@/lib/stock/exportStockLevelPdf";
import { sendStockLevelEmail } from "@/lib/brevo/sendStockLevelEmail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/stock/level/email
 * Body: { to?, category?, type? }
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const category = body.category;
    const type = body.type;

    const { levels, restaurantName, restaurantEmail } = await getStockLevels({
      restaurantId: request.restaurant,
      category,
      type,
    });

    const to = String(body.to || restaurantEmail || "").trim();
    if (!to || !EMAIL_RE.test(to)) {
      return sendError(
        new Error("Bad Request"),
        "A valid email address is required",
        400
      );
    }

    const labels = await getStockFilterLabels(request.restaurant, category, type);
    const [pdfBuffer, excelBuffer] = await Promise.all([
      exportStockLevelPdf({ levels, restaurantName, ...labels }),
      exportStockLevelExcel({ levels, restaurantName, ...labels }),
    ]);

    await sendStockLevelEmail({
      to,
      restaurantName,
      pdfBuffer,
      excelBuffer,
      ...labels,
      productCount: levels.length,
    });

    return sendSuccess({ to }, "Stock level report emailed");
  } catch (error) {
    console.error("Stock level email error:", error);
    return sendError(error, error.message || "Failed to email stock level report", 500);
  }
}, ["ADMIN", "MANAGER"]);
