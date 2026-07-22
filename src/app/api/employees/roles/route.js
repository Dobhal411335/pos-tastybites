import { withAuth } from "@/utils/auth";
import Role from "@/models/employee/Role";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all roles
export const GET = withAuth(async (request) => {
  try {
    const roles = await Role.find().lean();
    return sendSuccess(roles, "Roles retrieved successfully");
  } catch (error) {
    logger.error("Failed to list roles", error);
    return sendError(error, "Failed to retrieve roles", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create new role
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { name, permissions } = data;

    if (!name) {
      return sendError(new Error("Missing field"), "Role name is required", 400);
    }

    const uppercaseName = name.toUpperCase();

    const existing = await Role.findOne({ name: uppercaseName });
    if (existing) {
      return sendError(new Error("Conflict"), "Role already exists", 409);
    }

    const newRole = await Role.create({
      name: uppercaseName,
      permissions: permissions || [],
    });

    logger.info(`Role created: ${uppercaseName}`);
    return sendSuccess(newRole, "Role created successfully", 201);
  } catch (error) {
    logger.error("Failed to create role", error);
    return sendError(error, "Failed to create role", 500);
  }
}, ["ADMIN"]);

// PUT - Update role permissions
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, name, permissions } = data;

    if (!_id) {
      return sendError(new Error("Missing field"), "Role ID is required", 400);
    }

    const updateData = {};
    if (name) updateData.name = name.toUpperCase();
    if (permissions) updateData.permissions = permissions;

    const updatedRole = await Role.findByIdAndUpdate(_id, updateData, { new: true });
    
    if (!updatedRole) {
      return sendError(new Error("Not Found"), "Role not found", 404);
    }

    logger.info(`Role updated: ${updatedRole.name}`);
    return sendSuccess(updatedRole, "Role updated successfully");
  } catch (error) {
    logger.error("Failed to update role", error);
    return sendError(error, "Failed to update role", 500);
  }
}, ["ADMIN"]);

// DELETE - Remove role
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Role ID is required", 400);
    }

    const deletedRole = await Role.findByIdAndDelete(id);
    
    if (!deletedRole) {
      return sendError(new Error("Not Found"), "Role not found", 404);
    }

    logger.info(`Role deleted: ${deletedRole.name}`);
    return sendSuccess(null, "Role deleted successfully");
  } catch (error) {
    logger.error("Failed to delete role", error);
    return sendError(error, "Failed to delete role", 500);
  }
}, ["ADMIN"]);
