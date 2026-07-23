import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import Floor from "@/models/floor/Floor";
import Table from "@/models/floor/Table";
import { hashPassword } from "@/utils/password";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";
import crypto from "crypto";
import ShiftTemplate from "@/models/employee/ShiftTemplate";
import EmployeeShift from "@/models/employee/EmployeeShift";
import { encryptString } from "@/utils/crypto";
import { sendEmployeeCredentials } from "@/lib/brevo/sendEmployeeCredentials";
import Restaurant from "@/models/Restaurant"
// GET - List all employees
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const id = searchParams.get("id");

    const query = { restaurant: request.restaurant };
    if (role) query.role = role;
    if (status) query.status = status;
    if (id) query._id = id;

    const employees = await Employee.find(query)
      .select("-password")
      .populate("defaultFloor", "name")
      .populate("assignedFloor", "name")
      .populate("assignedTables", "tableNumber")
      .lean();

    return sendSuccess(employees, "Employees retrieved successfully");
  } catch (error) {
    logger.error("Failed to list employees", error);
    return sendError(error, "Failed to retrieve employees", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create new employee
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { firstName, lastName, email, phoneNumber, role, password, status, profileImage, defaultFloor, employeeColor, assignedFloor, assignedTables, defaultShiftTemplate, weeklyOff, availableDays } = data;

    // Validation
    if (!firstName || !lastName || !email || !phoneNumber) {
      return sendError(new Error("Missing fields"), "First name, last name, email, and phone number are required", 400);
    }

    // Check unique email and phone
    const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return sendError(new Error("Conflict"), "Employee with this email already exists", 409);
    }

    const existingPhone = await Employee.findOne({ phoneNumber });
    if (existingPhone) {
      return sendError(new Error("Conflict"), "Employee with this phone number already exists", 409);
    }

    const newEmployee = await Employee.create({
      restaurant: request.restaurant,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phoneNumber,
      role: role || "Staff",
      status: "Pending Approval",
      profileImage,
      defaultFloor: defaultFloor || null,
      employeeColor: employeeColor || "#4ade80",
      assignedFloor: assignedFloor || null,
      assignedTables: assignedTables || [],
      defaultShiftTemplate: defaultShiftTemplate || null,
      weeklyOff: weeklyOff || [],
      availableDays: availableDays || [],
    });

    // Update tables with this employee assignment
    if (assignedTables && assignedTables.length > 0) {
      await mongoose.model("Table").updateMany(
        { _id: { $in: assignedTables }, restaurant: request.restaurant },
        { $set: { assignedEmployee: newEmployee._id } }
      );
      logger.info(`Employee Assigned to tables: ${assignedTables.join(', ')}`);
    }

    // Auto-generate 30 days of schedule if defaultShiftTemplate is provided
    if (defaultShiftTemplate) {
      const template = await ShiftTemplate.findById(defaultShiftTemplate);
      if (template) {
        const shiftsToCreate = [];
        let currentDate = new Date();
        currentDate.setHours(0,0,0,0);
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 30);

        const shiftStartTemplate = new Date(`1970-01-01T${template.startTime}:00`);
        const shiftEndTemplate = new Date(`1970-01-01T${template.endTime}:00`);

        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
          
          let shouldSchedule = true;
          if (weeklyOff && weeklyOff.includes(dayOfWeek)) shouldSchedule = false;
          if (availableDays && availableDays.length > 0 && !availableDays.includes(dayOfWeek)) shouldSchedule = false;
          if (template.workingDays && template.workingDays.length > 0 && !template.workingDays.includes(dayOfWeek)) shouldSchedule = false;

          if (shouldSchedule) {
            const sTime = new Date(currentDate);
            sTime.setHours(shiftStartTemplate.getHours(), shiftStartTemplate.getMinutes(), 0, 0);

            const eTime = new Date(currentDate);
            eTime.setHours(shiftEndTemplate.getHours(), shiftEndTemplate.getMinutes(), 0, 0);
            if (eTime <= sTime) eTime.setDate(eTime.getDate() + 1);

            shiftsToCreate.push({
              employee: newEmployee._id,
              restaurant: request.restaurant,
              date: new Date(currentDate),
              startTime: sTime,
              endTime: eTime,
              status: "Scheduled",
              shiftType: "Regular",
              templateId: template._id,
              assignedFloor: assignedFloor || null,
              assignedTables: assignedTables || []
            });
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (shiftsToCreate.length > 0) {
          await EmployeeShift.insertMany(shiftsToCreate);
          logger.info(`Auto-generated ${shiftsToCreate.length} default shifts for new employee ${newEmployee._id}`);
        }
      }
    }

    const employeeObj = newEmployee.toObject();

    logger.info(`Employee created: ${email}`);
    return sendSuccess(employeeObj, "Employee created successfully", 201);
  } catch (error) {
    logger.error("Failed to create employee", error);
    return sendError(error, "Failed to create employee", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update employee
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, action, firstName, lastName, phoneNumber, role, status, profileImage, defaultFloor, employeeColor, assignedFloor, assignedTables, defaultShiftTemplate, weeklyOff, availableDays } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Employee ID is required", 400);
    }

    // Ensure they belong to the same restaurant
    const existing = await Employee.findOne({ _id, restaurant: request.restaurant });
    if (!existing) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    // Generate random 10 char password
    const generatePassword = () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let pass = "";
      for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
      return pass;
    };

    if (action === "updateEmployee") {
      if (firstName) existing.firstName = firstName;
      if (lastName) existing.lastName = lastName;
      if (phoneNumber) existing.phoneNumber = phoneNumber;
      if (role) existing.role = role;
      if (employeeColor) existing.employeeColor = employeeColor;
      if (defaultShiftTemplate !== undefined) existing.defaultShiftTemplate = defaultShiftTemplate;
      
      await existing.save();
      return sendSuccess(existing, "Employee updated successfully");
    }

    if (action === "approve") {
      if (existing.status !== "Pending Approval") return sendError(new Error("Invalid State"), "Employee is not pending approval", 400);
      
      const count = await Employee.countDocuments({ restaurant: request.restaurant, employeeId: { $exists: true } });
      const employeeId = `EMP-${(count + 1).toString().padStart(4, "0")}`;
      
      let usernameBase = existing.firstName.toLowerCase() + "." + existing.lastName.toLowerCase();
      usernameBase = usernameBase.replace(/[^a-z0-9.]/g, "");
      let username = usernameBase;
      let counter = 1;
      while (await Employee.findOne({ restaurant: request.restaurant, username })) {
        counter++;
        username = usernameBase + counter;
      }

      const rawPassword = generatePassword();
      const hashedPassword = await hashPassword(rawPassword);
      const encPassword = encryptString(rawPassword);

      existing.employeeId = employeeId;
      existing.username = username;
      existing.password = hashedPassword;
      existing.encryptedPassword = encPassword;
      existing.status = "Approved";
      existing.credentialGenerated = true;
      existing.passwordGeneratedAt = new Date();
      await existing.save();

      logger.info(`Employee Approved & Credentials Generated: ${existing.email}`);
      return sendSuccess(existing, "Employee approved and credentials generated");
    }

    if (action === "regeneratePassword") {
      const rawPassword = generatePassword();
      const hashedPassword = await hashPassword(rawPassword);
      const encPassword = encryptString(rawPassword);

      existing.password = hashedPassword;
      existing.encryptedPassword = encPassword;
      existing.passwordGeneratedAt = new Date();
      await existing.save();

      logger.info(`Employee Password Regenerated: ${existing.email}`);
      return sendSuccess(existing, "Password regenerated successfully");
    }

    if (action === "sendCredentials") {
      if (!existing.credentialGenerated) return sendError(new Error("Invalid State"), "Credentials not yet generated", 400);
      
      const decryptedPassword = encryptString ? existing.encryptedPassword /* NOTE: Need decryptString here! */ : "";
      
      // We will send email using the employee's raw password that they just got, or we can just say "Contact admin for password". Wait, if we send email, we need the raw password. We decrypt it here.
      const crypto = require('@/utils/crypto');
      const pass = crypto.decryptString(existing.encryptedPassword);

      if (!pass) return sendError(new Error("Decryption Failed"), "Could not decrypt password for email", 500);

      const restaurantModel = mongoose.model('Restaurant');
      const restaurant = await restaurantModel.findById(request.restaurant);
      const restaurantName = restaurant ? restaurant.name : "";
      const loginUrl = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/login` : "https://pos.tastybitesrestaurant.com/login";

      try {
        await sendEmployeeCredentials({
          employeeName: `${existing.firstName} ${existing.lastName}`,
          employeeId: existing.employeeId,
          username: existing.username,
          password: pass,
          role: existing.role,
          restaurantName: restaurantName,
          floor: null, // Depending on if we populate assignedFloor, leaving null for now as per template resilience
          device: null,
          loginUrl: loginUrl,
          email: existing.email,
          logoUrl: null
        });

        logger.info(`Sending credentials email to ${existing.email}`);

        existing.credentialSent = true;
        existing.credentialSentAt = new Date();
        await existing.save();

        return sendSuccess(existing, "Credentials sent successfully");
      } catch (err) {
        logger.error(`Error sending credentials to ${existing.email}`, err);
        return sendError(err, "Failed to send credentials via email", 500);
      }
    }

    const updateData = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phoneNumber && { phoneNumber }),
      ...(role && { role }),
      ...(status && { status }),
      ...(profileImage && { profileImage }),
      ...(defaultFloor && { defaultFloor }),
      ...(employeeColor && { employeeColor }),
      ...(assignedFloor !== undefined && { assignedFloor }),
      ...(assignedTables && { assignedTables }),
      ...(defaultShiftTemplate !== undefined && { defaultShiftTemplate }),
      ...(weeklyOff !== undefined && { weeklyOff }),
      ...(availableDays !== undefined && { availableDays }),
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(_id, updateData, { new: true }).select("-password");

    // Manage Table Assignments
    if (assignedTables !== undefined) {
      // Unassign from old tables
      await mongoose.model("Table").updateMany(
        { assignedEmployee: _id, restaurant: request.restaurant },
        { $set: { assignedEmployee: null } }
      );
      // Assign to new tables
      if (assignedTables.length > 0) {
        await mongoose.model("Table").updateMany(
          { _id: { $in: assignedTables }, restaurant: request.restaurant },
          { $set: { assignedEmployee: _id } }
        );
      }
      logger.info(`Employee ${_id} assignments updated`);
    }

    logger.info(`Employee updated: ${existing.email}`);
    return sendSuccess(updatedEmployee, "Employee updated successfully");
  } catch (error) {
    logger.error("Failed to update employee", error);
    return sendError(error, "Failed to update employee", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove employee
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Employee ID is required", 400);
    }

    const employee = await Employee.findOneAndDelete({ _id: id, restaurant: request.restaurant });

    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    logger.info(`Employee deleted: ${employee.email}`);
    return sendSuccess(null, "Employee deleted successfully");
  } catch (error) {
    logger.error("Failed to delete employee", error);
    return sendError(error, "Failed to delete employee", 500);
  }
}, ["ADMIN"]);
