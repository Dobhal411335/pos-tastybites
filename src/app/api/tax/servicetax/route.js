import { withAuth } from "@/utils/auth";
import ServiceTax from "@/models/tax/ServiceTax";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const normalizeType = (type) => {
  const t = String(type || "").trim();
  if (/^percent$/i.test(t)) return "Percent";
  if (/^amount$/i.test(t)) return "Amount";
  return null;
};

// GET - List service taxes for the restaurant
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "1";

    const filter = { restaurant: request.restaurant };
    if (activeOnly) filter.status = "Active";

    const items = await ServiceTax.find(filter).sort({ createdAt: -1 }).lean();
    return sendSuccess(items, "Service taxes retrieved successfully");
  } catch (error) {
    logger.error("Failed to list service taxes", error);
    return sendError(error, "Failed to retrieve service taxes", 500);
  }
});

// POST - Create a new service tax
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const name = String(data.name || "").trim();
    const value = Number(data.value);
    const type = normalizeType(data.type);

    if (!name || !Number.isFinite(value) || value < 0 || !type) {
      return sendError(
        new Error("Missing fields"),
        "Name, value, and type (Amount or Percent) are required",
        400,
      );
    }

    const created = await ServiceTax.create({
      restaurant: request.restaurant,
      name,
      value,
      type,
      status: "Active",
      createdBy: request.user.id,
    });

    logger.info(`Service tax created: ${name}`);
    return sendSuccess(created, "Service tax created successfully", 201);
  } catch (error) {
    logger.error("Failed to create service tax", error);
    return sendError(error, "Failed to create service tax", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update an existing service tax
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, name, value, type, status } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Service tax ID is required", 400);
    }

    const updateData = { updatedBy: request.user.id };
    if (name !== undefined) updateData.name = String(name).trim();
    if (value !== undefined) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        return sendError(new Error("Invalid value"), "Value must be a non-negative number", 400);
      }
      updateData.value = n;
    }
    if (type !== undefined) {
      const normalized = normalizeType(type);
      if (!normalized) {
        return sendError(new Error("Invalid type"), "Type must be Amount or Percent", 400);
      }
      updateData.type = normalized;
    }
    if (status !== undefined) updateData.status = status;

    const updated = await ServiceTax.findOneAndUpdate(
      { _id, restaurant: request.restaurant },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return sendError(new Error("Not Found"), "Service tax not found", 404);
    }

    logger.info(`Service tax updated: ${_id}`);
    return sendSuccess(updated, "Service tax updated successfully");
  } catch (error) {
    logger.error("Failed to update service tax", error);
    return sendError(error, "Failed to update service tax", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove a service tax
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Service tax ID is required", 400);
    }

    const deleted = await ServiceTax.findOneAndDelete({
      _id: id,
      restaurant: request.restaurant,
    });

    if (!deleted) {
      return sendError(new Error("Not Found"), "Service tax not found", 404);
    }

    logger.info(`Service tax deleted: ${id}`);
    return sendSuccess(null, "Service tax deleted successfully");
  } catch (error) {
    logger.error("Failed to delete service tax", error);
    return sendError(error, "Failed to delete service tax", 500);
  }
}, ["ADMIN", "MANAGER"]);
