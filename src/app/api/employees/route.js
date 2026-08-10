import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
import Floor from "@/models/floor/Floor";
import Table from "@/models/floor/Table";
import { hashPassword } from "@/utils/password";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";
import ShiftTemplate from "@/models/employee/ShiftTemplate";
import EmployeeShift from "@/models/employee/EmployeeShift";
import EmployeeSession from "@/models/employee/EmployeeSession";
import EmployeeLog from "@/models/employee/EmployeeLog";
import DutyChange from "@/models/employee/DutyChange";
import OvertimeRecord from "@/models/employee/OvertimeRecord";
import ShiftHistory from "@/models/employee/ShiftHistory";
import RegisteredDevice from "@/models/RegisteredDevice";
import { sendEmployeeCredentials } from "@/lib/brevo/sendEmployeeCredentials";
import { generateActivationCode } from "@/utils/crypto";
import Restaurant from "@/models/Restaurant"

function normalizeHourlyPaid(hourlyPaid) {
  if (!hourlyPaid) return undefined;
  const hours = Number(hourlyPaid.totalWorkingHours);
  const amountPerHour = hourlyPaid.amountPerHour != null && hourlyPaid.amountPerHour !== ""
    ? Number(hourlyPaid.amountPerHour)
    : null;
  const overtimeAmountPerHour = hourlyPaid.overtimeAmountPerHour != null && hourlyPaid.overtimeAmountPerHour !== ""
    ? Number(hourlyPaid.overtimeAmountPerHour)
    : null;
  const totalAmountPerDay =
    Number.isFinite(hours) && Number.isFinite(amountPerHour)
      ? Number((hours * amountPerHour).toFixed(2))
      : hourlyPaid.totalAmountPerDay != null
        ? Number(hourlyPaid.totalAmountPerDay)
        : null;

  return {
    totalWorkingHours: hourlyPaid.totalWorkingHours != null ? String(hourlyPaid.totalWorkingHours) : "",
    amountPerHour: Number.isFinite(amountPerHour) ? amountPerHour : null,
    totalAmountPerDay: Number.isFinite(totalAmountPerDay) ? totalAmountPerDay : null,
    overtimeAmountPerHour: Number.isFinite(overtimeAmountPerHour) ? overtimeAmountPerHour : null,
  };
}

async function assertTipPercentAvailable(restaurantId, tipPercent, excludeEmployeeId = null) {
  if (tipPercent === undefined || tipPercent === null || tipPercent === "") return undefined;
  const value = Number(tipPercent);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw Object.assign(new Error("Tip percent must be between 0 and 100"), { status: 400 });
  }

  const query = { restaurant: restaurantId };
  if (excludeEmployeeId) query._id = { $ne: excludeEmployeeId };

  const peers = await Employee.find(query).select("tipPercent").lean();
  const used = peers.reduce((sum, emp) => sum + (Number(emp.tipPercent) || 0), 0);
  const remaining = Number((100 - used).toFixed(2));

  if (value > remaining) {
    throw Object.assign(
      new Error(`Tip percent exceeds remaining allocation. Available: ${remaining}%`),
      { status: 400 }
    );
  }

  return value;
}

/**
 * Generate planned shifts from a default shift template (next `days` days).
 * Skips days that already have an isPlanned shift for this employee.
 */
async function allocateDefaultShifts({
  restaurantId,
  employee,
  templateId,
  weeklyOff = [],
  availableDays = [],
  days = 30,
}) {
  if (!templateId) return { created: 0, reason: "no_template" };

  const template = await ShiftTemplate.findOne({ _id: templateId, restaurant: restaurantId });
  if (!template) {
    logger.warn(`allocateDefaultShifts: template ${templateId} not found for restaurant ${restaurantId}`);
    return { created: 0, reason: "template_not_found" };
  }

  const { parseTemplateTime, zonedDateTime, weekdayInRestaurantTz, restaurantCalendarDate } =
    await import("@/lib/restaurantTime");
  const startHm = parseTemplateTime(template.startTime);
  const endHm = parseTemplateTime(template.endTime);
  if (!startHm || !endHm) {
    logger.warn(`allocateDefaultShifts: invalid template times for ${templateId}`);
    return { created: 0, reason: "invalid_times" };
  }

  const startD = restaurantCalendarDate(new Date());
  const endD = new Date(startD);
  endD.setUTCDate(endD.getUTCDate() + days);

  const existingShifts = await EmployeeShift.find({
    employee: employee._id,
    restaurant: restaurantId,
    date: { $gte: startD, $lte: endD },
    isPlanned: true,
  })
    .select("date")
    .lean();

  const existingSet = new Set(
    existingShifts.map((s) => new Date(s.date).toISOString().split("T")[0])
  );

  const shiftsToCreate = [];
  const now = new Date();
  const currentDate = new Date(startD);

  while (currentDate <= endD) {
    const dayOfWeek = weekdayInRestaurantTz(currentDate);
    const dateKey = currentDate.toISOString().split("T")[0];
    const month = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, "0")}`;

    let shouldSchedule = true;
    if (existingSet.has(dateKey)) shouldSchedule = false;
    if (weeklyOff?.includes(dayOfWeek)) shouldSchedule = false;
    if (availableDays?.length > 0 && !availableDays.includes(dayOfWeek)) shouldSchedule = false;
    if (employee.leaveStatus && employee.leaveStatus !== "None") shouldSchedule = false;
    if (template.workingDays?.length > 0 && !template.workingDays.includes(dayOfWeek)) {
      shouldSchedule = false;
    }

    if (shouldSchedule) {
      const sTime = zonedDateTime(currentDate, startHm.hours, startHm.minutes);
      let eTime = zonedDateTime(currentDate, endHm.hours, endHm.minutes);
      if (eTime <= sTime) eTime = new Date(eTime.getTime() + 24 * 60 * 60 * 1000);

      shiftsToCreate.push({
        employee: employee._id,
        restaurant: restaurantId,
        date: new Date(currentDate),
        startTime: sTime,
        endTime: eTime,
        status: "Scheduled",
        shiftType: "Regular",
        templateId: template._id,
        assignedFloor: employee.assignedFloor || employee.defaultFloor || null,
        assignedTables: employee.assignedTables || [],
        isPlanned: true,
        month,
        generatedAt: now,
      });
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  if (shiftsToCreate.length === 0) {
    logger.warn(
      `allocateDefaultShifts: 0 shifts for employee ${employee._id} template ${templateId} (workingDays=${JSON.stringify(template.workingDays || [])})`
    );
    return { created: 0, reason: "no_schedulable_days" };
  }

  await EmployeeShift.insertMany(shiftsToCreate);
  logger.info(`allocateDefaultShifts: created ${shiftsToCreate.length} shifts for employee ${employee._id}`);
  return { created: shiftsToCreate.length, reason: "ok" };
}

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
      .select("-password -plainPassword")
      .populate("defaultFloor", "name")
      .populate("assignedFloor", "name")
      .populate("assignedTables", "tableNumber")
      .populate("assignedDevice")
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
    const { firstName, lastName, email, countryCode, phoneNumber, role, password, status, profileImage, defaultFloor, employeeColor, assignedFloor, assignedTables, defaultShiftTemplate, weeklyOff, availableDays, hourlyPaid, staffDiscount, tipPercent } = data;

    // Validation
    if (!firstName || !lastName || !email || !phoneNumber) {
      return sendError(new Error("First name, last name, email, and phone number are required"), "Missing fields", 400);
    }

    // Check unique email and phone
    const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return sendError(new Error("Employee with this email already exists"), "Conflict", 409);
    }

    const existingPhone = await Employee.findOne({ phoneNumber });
    if (existingPhone) {
      return sendError(new Error("Employee with this phone number already exists"), "Conflict", 409);
    }

    let validatedTipPercent;
    try {
      validatedTipPercent = await assertTipPercentAvailable(request.restaurant, tipPercent);
    } catch (tipErr) {
      return sendError(tipErr, tipErr.message, tipErr.status || 400);
    }

    const normalizedHourlyPaid = normalizeHourlyPaid(hourlyPaid);

    const newEmployee = await Employee.create({
      restaurant: request.restaurant,
      firstName,
      lastName,
      email: email.toLowerCase(),
      countryCode: countryCode || "+1",
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
      hourlyPaid: normalizedHourlyPaid,
      tipPercent: validatedTipPercent,
      staffDiscount: staffDiscount !== undefined ? staffDiscount : undefined,
    });

    // Update tables with this employee assignment
    if (assignedTables && assignedTables.length > 0) {
      await mongoose.model("Table").updateMany(
        { _id: { $in: assignedTables }, restaurant: request.restaurant },
        { $set: { assignedEmployee: newEmployee._id } }
      );
      logger.info(`Employee Assigned to tables: ${assignedTables.join(', ')}`);
    }

    // Auto-generate planned schedule if defaultShiftTemplate is provided
    if (defaultShiftTemplate) {
      await allocateDefaultShifts({
        restaurantId: request.restaurant,
        employee: newEmployee,
        templateId: defaultShiftTemplate,
        weeklyOff: weeklyOff || [],
        availableDays: availableDays || [],
      });
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
    const { _id, action, firstName, lastName, countryCode, phoneNumber, role, status, profileImage, defaultFloor, employeeColor, assignedFloor, assignedTables, defaultShiftTemplate, weeklyOff, availableDays, hourlyPaid, staffDiscount, tipPercent } = data;

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
      const previousTemplateId = existing.defaultShiftTemplate
        ? String(existing.defaultShiftTemplate)
        : null;

      if (firstName) existing.firstName = firstName;
      if (lastName) existing.lastName = lastName;
      if (countryCode) existing.countryCode = countryCode;
      if (phoneNumber) existing.phoneNumber = phoneNumber;
      if (role) existing.role = role;
      if (employeeColor) existing.employeeColor = employeeColor;
      if (defaultShiftTemplate !== undefined) existing.defaultShiftTemplate = defaultShiftTemplate;
      if (hourlyPaid !== undefined) existing.hourlyPaid = normalizeHourlyPaid(hourlyPaid);
      if (staffDiscount !== undefined) existing.staffDiscount = staffDiscount;
      if (tipPercent !== undefined) {
        try {
          existing.tipPercent = await assertTipPercentAvailable(request.restaurant, tipPercent, _id);
        } catch (tipErr) {
          return sendError(tipErr, tipErr.message, tipErr.status || 400);
        }
      }

      await existing.save();

      const nextTemplateId = existing.defaultShiftTemplate
        ? String(existing.defaultShiftTemplate)
        : null;
      if (nextTemplateId) {
        const templateChanged = nextTemplateId !== previousTemplateId;
        let needsBackfill = false;
        if (!templateChanged) {
          const upcomingCount = await EmployeeShift.countDocuments({
            employee: existing._id,
            restaurant: request.restaurant,
            isPlanned: true,
            date: { $gte: new Date() },
          });
          needsBackfill = upcomingCount === 0;
        }

        if (templateChanged || needsBackfill) {
          await allocateDefaultShifts({
            restaurantId: request.restaurant,
            employee: existing,
            templateId: nextTemplateId,
            weeklyOff: existing.weeklyOff || [],
            availableDays: existing.availableDays || [],
          });
        }
      }

      const employeeData = existing.toObject();
      delete employeeData.password;
      delete employeeData.plainPassword;
      return sendSuccess(employeeData, "Employee updated successfully");
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

      // Auto-create a RegisteredDevice for this employee
      const activationCode = generateActivationCode();
      const newDevice = await RegisteredDevice.create({
        restaurant: request.restaurant,
        deviceCode: `DEV-${Date.now()}`,
        deviceName: `${existing.firstName}'s Device`,
        deviceType: 'Tablet',
        activationCode,
        activationStatus: 'Pending',
        assignedEmployee: existing._id,
      });

      existing.employeeId = employeeId;
      existing.username = username;
      existing.password = hashedPassword;
      existing.plainPassword = rawPassword;
      existing.status = "Approved";
      existing.credentialGenerated = true;
      existing.passwordGeneratedAt = new Date();
      existing.assignedDevice = newDevice._id;
      await existing.save();

      logger.info(`Employee Approved & Credentials Generated: ${existing.email}`);
      const employeeData = existing.toObject();
      delete employeeData.password;
      employeeData.activationCode = activationCode; // Pass back for UI
      return sendSuccess(employeeData, "Employee approved and credentials generated");
    }

    if (action === "regeneratePassword") {
      const rawPassword = generatePassword();
      const hashedPassword = await hashPassword(rawPassword);

      existing.password = hashedPassword;
      existing.plainPassword = rawPassword;
      existing.passwordGeneratedAt = new Date();
      await existing.save();

      logger.info(`Employee Password Regenerated: ${existing.email}`);
      const employeeData = existing.toObject();
      delete employeeData.password;
      return sendSuccess(employeeData, "Password regenerated successfully");
    }

    if (action === "sendCredentials") {
      if (!existing.credentialGenerated) return sendError(new Error("Invalid State"), "Credentials not yet generated", 400);
      
      if (!existing.plainPassword) {
        return sendError(new Error("No Password"), "Please regenerate the password for this employee.", 400);
      }

      const restaurantModel = mongoose.model('Restaurant');
      const restaurant = await restaurantModel.findById(request.restaurant);
      const restaurantName = restaurant ? restaurant.name : "";
      const loginUrl = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/login` : "https://pos.tastybitesrestaurant.com/login";

      let activationCode = null;
      if (existing.assignedDevice) {
        const device = await RegisteredDevice.findById(existing.assignedDevice);
        if (device && device.activationCode) {
          activationCode = device.activationCode;
        }
      }

      try {
        await sendEmployeeCredentials({
          employeeName: `${existing.firstName} ${existing.lastName}`,
          employeeId: existing.employeeId,
          username: existing.username,
          password: existing.plainPassword,
          role: existing.role,
          restaurantName: restaurantName,
          floor: null, // Depending on if we populate assignedFloor, leaving null for now as per template resilience
          device: null,
          loginUrl: loginUrl,
          email: existing.email,
          logoUrl: null,
          activationCode: activationCode
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

    if (action === "generateDeviceToken") {
      if (existing.status !== "Active" && existing.status !== "Approved") {
        return sendError(new Error("Invalid State"), "Employee must be active or approved to generate a new device token", 400);
      }

      // 1. Retire old device if exists
      if (existing.assignedDevice) {
        await RegisteredDevice.findByIdAndUpdate(existing.assignedDevice, {
          status: 'Retired',
          activationStatus: 'Reset Required'
        });
      }

      // 2. Generate new device and activation code
      const activationCode = generateActivationCode();
      const newDevice = await RegisteredDevice.create({
        restaurant: request.restaurant,
        deviceCode: `DEV-${Date.now()}`,
        deviceName: `${existing.firstName}'s Device`,
        deviceType: 'Tablet',
        activationCode,
        activationStatus: 'Pending',
        assignedEmployee: existing._id,
      });

      existing.assignedDevice = newDevice._id;
      existing.deviceActivationRequired = true;
      await existing.save();

      // 3. Send email with new credentials
      const restaurantModel = mongoose.model('Restaurant');
      const restaurant = await restaurantModel.findById(request.restaurant);
      const restaurantName = restaurant ? restaurant.name : "";
      const loginUrl = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/login` : "https://pos.tastybitesrestaurant.com/login";

      try {
        await sendEmployeeCredentials({
          employeeName: `${existing.firstName} ${existing.lastName}`,
          employeeId: existing.employeeId,
          username: existing.username,
          password: existing.plainPassword || "******** (Password remains unchanged)",
          role: existing.role,
          restaurantName: restaurantName,
          floor: null,
          device: null,
          loginUrl: loginUrl,
          email: existing.email,
          logoUrl: null,
          activationCode: activationCode
        });

        logger.info(`Sending NEW device activation code to ${existing.email}`);
        return sendSuccess({ activationCode }, "New device token generated and sent via email");
      } catch (err) {
        logger.error(`Error sending new device token to ${existing.email}`, err);
        return sendError(err, "Device token generated but failed to send email", 500);
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
      ...(hourlyPaid !== undefined && { hourlyPaid: normalizeHourlyPaid(hourlyPaid) }),
      ...(staffDiscount !== undefined && { staffDiscount }),
      ...(tipPercent !== undefined && { tipPercent }),
    };

    if (tipPercent !== undefined) {
      try {
        updateData.tipPercent = await assertTipPercentAvailable(request.restaurant, tipPercent, _id);
      } catch (tipErr) {
        return sendError(tipErr, tipErr.message, tipErr.status || 400);
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(_id, updateData, { new: true }).select("-password -plainPassword");

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

    const employee = await Employee.findOne({ _id: id, restaurant: request.restaurant });

    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    await Promise.all([
      Table.updateMany(
        { assignedEmployee: employee._id, restaurant: request.restaurant },
        { $set: { assignedEmployee: null } }
      ),
      RegisteredDevice.updateMany(
        { assignedEmployee: employee._id, restaurant: request.restaurant },
        { $set: { assignedEmployee: null } }
      ),
    ]);

    await Promise.all([
      EmployeeShift.deleteMany({ employee: employee._id, restaurant: request.restaurant }),
      EmployeeSession.deleteMany({ employee: employee._id, restaurant: request.restaurant }),
      EmployeeLog.deleteMany({ employee: employee._id, restaurant: request.restaurant }),
      DutyChange.deleteMany({ employee: employee._id, restaurant: request.restaurant }),
      OvertimeRecord.deleteMany({ employee: employee._id, restaurant: request.restaurant }),
      ShiftHistory.deleteMany({ employee: employee._id, restaurant: request.restaurant }),
    ]);

    await Employee.deleteOne({ _id: employee._id, restaurant: request.restaurant });

    logger.info(`Employee deleted: ${employee.email}`);
    return sendSuccess(null, "Employee and related records deleted successfully");
  } catch (error) {
    logger.error("Failed to delete employee", error);
    return sendError(error, "Failed to delete employee", 500);
  }
}, ["ADMIN"]);
