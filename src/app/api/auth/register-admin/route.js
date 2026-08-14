import connectDB from "@/lib/db";
import Restaurant from "@/models/Restaurant";
import Admin from "@/models/Admin";
import { hashPassword } from "@/utils/password";
import { sendError } from "@/utils/errorHandler";

/**
 * Bootstrap-only endpoint. Disabled unless REGISTER_ADMIN_SECRET is set and
 * provided via header `x-register-admin-secret` or body `registerSecret`.
 */
export async function POST(request) {
  try {
    const bootstrapSecret = process.env.REGISTER_ADMIN_SECRET;
    if (!bootstrapSecret) {
      return Response.json(
        { success: false, message: "Admin registration is disabled" },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { name, email, password, restaurantName, registerSecret } = body;
    const headerSecret = request.headers.get("x-register-admin-secret");

    if (headerSecret !== bootstrapSecret && registerSecret !== bootstrapSecret) {
      return Response.json(
        { success: false, message: "Admin registration is disabled" },
        { status: 403 }
      );
    }

    if (!name || !email || !password) {
      return Response.json(
        { success: false, message: "name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return Response.json(
        { success: false, message: "Admin with this email already exists" },
        { status: 400 }
      );
    }

    // Get or Create restaurant
    const rName = restaurantName || "";
    const rSlug = rName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    let restaurant = await Restaurant.findOne({ slug: rSlug });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        name: rName,
        slug: rSlug,
        email: email, // Using Admin's email for the restaurant
        isActive: true,
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create Admin
    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: "Admin",
      restaurantId: restaurant._id,
    });

    return Response.json(
      {
        success: true,
        message: "Admin registered successfully",
        data: {
          admin: {
            id: newAdmin._id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role,
          },
          restaurant: {
            id: restaurant._id,
            name: restaurant.name,
            slug: restaurant.slug,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
