import Restaurant from "@/models/Restaurant";
import { buildAdminActivity } from "./activity";
import { buildAdminRevenue } from "./revenue";
import { buildAdminDailySummary } from "./dailySummary";
import { buildAdminTodayOrders } from "./todayOrder";
import { buildAdminAudit } from "./audit";
import { buildAdminKitchen } from "./kitchen";
import { buildAdminBar } from "./bar";

const EXPORT_PAGE = { page: 1, pageSize: 5000 };

export async function buildAdminExportPayload(filters) {
  const section = filters.section || "activity";
  const restaurant = await Restaurant.findById(filters.restaurantId)
    .select("name")
    .lean();
  const restaurantName = restaurant?.name || "Tasty Bites";

  if (section === "revenue") {
    return {
      section,
      restaurantName,
      data: await buildAdminRevenue(filters),
    };
  }
  if (section === "daily-summary") {
    return {
      section,
      restaurantName,
      data: await buildAdminDailySummary(filters),
    };
  }
  if (section === "today-order") {
    return {
      section,
      restaurantName,
      data: await buildAdminTodayOrders({ ...filters, ...EXPORT_PAGE }),
    };
  }
  if (section === "audit") {
    return {
      section,
      restaurantName,
      data: await buildAdminAudit({ ...filters, ...EXPORT_PAGE }),
    };
  }
  if (section === "kitchen") {
    return {
      section,
      restaurantName,
      data: await buildAdminKitchen({ ...filters, ...EXPORT_PAGE }),
    };
  }
  if (section === "bar") {
    return {
      section,
      restaurantName,
      data: await buildAdminBar({ ...filters, ...EXPORT_PAGE }),
    };
  }

  return {
    section: "activity",
    restaurantName,
    data: await buildAdminActivity({ ...filters, ...EXPORT_PAGE }),
  };
}
