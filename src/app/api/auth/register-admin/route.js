import connectDB from "@/lib/db";
import Restaurant from "@/models/Restaurant";
import Admin from "@/models/Admin";
import { hashPassword } from "@/utils/password";
import { sendError } from "@/utils/errorHandler";

export async function POST(request) {
  try {
    await connectDB();
    const { name, email, password, restaurantName } = await request.json();

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
    const rName = restaurantName || "Tasty Bites";
    const rSlug = rName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    let restaurant = await Restaurant.findOne({ slug: rSlug });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        name: rName,
        slug: rSlug,
        email: `info@${rSlug}.com`,
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
      role: "ADMIN",
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
