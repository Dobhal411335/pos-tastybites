import mongoose from "mongoose";
import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  restaurantDayBounds,
} from "@/lib/restaurantTime";

const HOUR_BUCKETS = [
  { key: "8AM", hour: 8 },
  { key: "10AM", hour: 10 },
  { key: "12PM", hour: 12 },
  { key: "2PM", hour: 14 },
  { key: "4PM", hour: 16 },
  { key: "6PM", hour: 18 },
];

function bucketLabel(hour) {
  if (hour < 10) return "8AM";
  if (hour < 12) return "10AM";
  if (hour < 14) return "12PM";
  if (hour < 16) return "2PM";
  if (hour < 18) return "4PM";
  return "6PM";
}

function emptyTotals() {
  return { volume: 0, newCount: 0, pending: 0, confirmed: 0, revenue: 0, taxes: 0, tips: 0 };
}

function percentChange(today, yesterday) {
  if (!yesterday) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

export const GET = withAuth(async (request) => {
  try {
    const restaurantId = mongoose.Types.ObjectId.isValid(request.restaurant)
      ? new mongoose.Types.ObjectId(request.restaurant)
      : request.restaurant;

    const { start: todayStart, end: todayEnd } = restaurantDayBounds();
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [todayAgg, yesterdayAgg, hourlyAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            restaurantId,
            createdAt: { $gte: todayStart, $lt: todayEnd },
            status: { $ne: "CANCELLED" },
          },
        },
        {
          $group: {
            _id: null,
            volume: { $sum: 1 },
            newCount: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "CONFIRMED"] }, 1, 0] } },
            confirmed: {
              $sum: { $cond: [{ $in: ["$status", ["COMPLETED", "PAID"]] }, 1, 0] },
            },
            revenue: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$totalAmount", 0] },
                  { $ifNull: ["$tipAmount", 0] },
                ],
              },
            },
            taxes: { $sum: { $ifNull: ["$taxTotal", 0] } },
            tips: { $sum: { $ifNull: ["$tipAmount", 0] } },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            restaurantId,
            createdAt: { $gte: yesterdayStart, $lt: todayStart },
            status: { $ne: "CANCELLED" },
          },
        },
        {
          $group: {
            _id: null,
            volume: { $sum: 1 },
            revenue: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$totalAmount", 0] },
                  { $ifNull: ["$tipAmount", 0] },
                ],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            restaurantId,
            createdAt: { $gte: todayStart, $lt: todayEnd },
            status: { $ne: "CANCELLED" },
          },
        },
        {
          $group: {
            _id: {
              $hour: { date: "$createdAt", timezone: DEFAULT_RESTAURANT_TIMEZONE },
            },
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$totalAmount", 0] },
                  { $ifNull: ["$tipAmount", 0] },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const today = todayAgg[0] || emptyTotals();
    const yesterday = yesterdayAgg[0] || { volume: 0, revenue: 0 };

    const hourlyMap = new Map();
    for (const row of hourlyAgg || []) {
      const key = bucketLabel(row._id);
      const prev = hourlyMap.get(key) || { orders: 0, revenue: 0 };
      hourlyMap.set(key, {
        orders: prev.orders + (row.orders || 0),
        revenue: prev.revenue + (row.revenue || 0),
      });
    }

    const orderChart = HOUR_BUCKETS.map((bucket) => ({
      time: bucket.key,
      val: hourlyMap.get(bucket.key)?.orders || 0,
    }));

    const revenueChart = HOUR_BUCKETS.map((bucket) => ({
      time: bucket.key,
      val: Math.round((hourlyMap.get(bucket.key)?.revenue || 0) * 100) / 100,
    }));

    const volume = today.volume || 0;
    const revenue = Math.round((today.revenue || 0) * 100) / 100;
    const taxes = Math.round((today.taxes || 0) * 100) / 100;
    const tips = Math.round((today.tips || 0) * 100) / 100;

    return sendSuccess(
      {
        volume,
        newCount: today.newCount || 0,
        pending: today.pending || 0,
        confirmed: today.confirmed || 0,
        revenue,
        taxes,
        tips,
        avgOrder: volume > 0 ? Math.round((revenue / volume) * 100) / 100 : 0,
        volumeChange: percentChange(volume, yesterday.volume || 0),
        revenueChange: percentChange(revenue, yesterday.revenue || 0),
        orderChart,
        revenueChart,
      },
      "Today's order stats retrieved successfully"
    );
  } catch (error) {
    logger.error("Failed to retrieve order stats", error);
    return sendError(error, "Failed to retrieve today's sales", 500);
  }
}, ["ADMIN", "MANAGER"]);
