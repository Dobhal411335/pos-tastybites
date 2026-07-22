import { NextResponse } from "next/server";
import { withAuth } from '@/utils/auth';
import connectDB from "@/lib/db";
import Role from "@/models/employee/Role";

export const GET = withAuth(async (request) => {
  try {
    await connectDB();
    const roles = await Role.find({ restaurant: request.restaurant }).sort({ name: 1 });
    
    // If no roles exist for this restaurant, create some defaults
    if (roles.length === 0) {
      const defaultRoles = [
        { name: "Admin", restaurant: request.restaurant },
        { name: "Manager", restaurant: request.restaurant },
        { name: "Staff", restaurant: request.restaurant }
      ];
      await Role.insertMany(defaultRoles);
      const newRoles = await Role.find({ restaurant: request.restaurant }).sort({ name: 1 });
      return NextResponse.json({ success: true, data: newRoles });
    }

    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    await connectDB();
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Role name is required" }, { status: 400 });
    }

    const existingRole = await Role.findOne({ name: name.trim(), restaurant: request.restaurant });
    if (existingRole) {
      return NextResponse.json({ success: false, message: "Role already exists" }, { status: 400 });
    }

    const role = await Role.create({
      name: name.trim(),
      restaurant: request.restaurant,
      permissions: []
    });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}, ["ADMIN", "MANAGER"]);
