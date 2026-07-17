import { withAuth } from "@/utils/auth";
import Employee from "@/models/Employee";
import { hashPassword } from "@/utils/password";

const createEmployeeHandler = async (request) => {
  try {
    const { firstName, lastName, email, phone, password, role } = await request.json();

    if (!firstName || !lastName || !email) {
      return Response.json(
        { success: false, message: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return Response.json(
        { success: false, message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash default or provided password
    const rawPassword = password || "TempPassword123!";
    const hashedPassword = await hashPassword(rawPassword);

    const newEmployee = await Employee.create({
      restaurantId: request.restaurant, // attached by withAuth middleware
      firstName,
      lastName,
      email,
      phone: phone || "",
      password: hashedPassword,
      role: role || "WAITER",
      status: "UNAPPROVED",
      isActive: true,
    });

    return Response.json(
      {
        success: true,
        message: "Employee account created successfully (Unapproved)",
        data: {
          id: newEmployee._id,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          email: newEmployee.email,
          phone: newEmployee.phone,
          status: newEmployee.status,
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
};

// Also support GET to list employees for the admin's restaurant
const listEmployeesHandler = async (request) => {
  try {
    const employees = await Employee.find({ restaurantId: request.restaurant }).lean();
    return Response.json({ success: true, data: employees });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
};

// Also support PUT to approve/suspend employees
export const PUT = withAuth(async (request) => {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return Response.json({ success: false, message: "ID and status are required" }, { status: 400 });
    }

    const updated = await Employee.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    return Response.json({ success: true, message: `Status updated to ${status}`, data: updated });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}, ["ADMIN"]);

export const POST = withAuth(createEmployeeHandler, ["ADMIN"]);
export const GET = withAuth(listEmployeesHandler, ["ADMIN"]);
