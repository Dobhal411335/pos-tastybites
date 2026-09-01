import { withAuth } from "@/utils/auth";
import Employee from "@/models/employee/Employee";
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
import Restaurant from "@/models/Restaurant";

async function checkMasterManagerConflict(restaurantId, role, excludeEmployeeId = null) {
  if (role !== "Master Terminal" && role !== "Manager Terminal") return;

  const query = {
    restaurant: restaurantId,
    role: { $in: ["Master Terminal", "Manager Terminal"] }
  };
  if (excludeEmployeeId) {
    query._id = { $ne: excludeEmployeeId };
  }

  const existing = await Employee.findOne(query).select("_id role").lean();
  if (existing) {
    throw Object.assign(
      new Error(`A ${existing.role} already exists for this restaurant. Only one admin-level terminal account is allowed.`),
      { status: 409 }
    );
  }
}

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

  const query = { restaurant: restaurantId, receiveOwnTips: { $ne: true } };
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
 * Tip share is either pool tip% OR keep tips from orders the employee processed — not both.
 */
function resolveTipSettings({ receiveOwnTips, tipPercent }) {
  const keepOwn = Boolean(receiveOwnTips);
  if (keepOwn) {
    return { receiveOwnTips: true, tipPercent: undefined };
  }
  if (tipPercent !== undefined && tipPercent !== null && tipPercent !== "") {
    return { receiveOwnTips: false, tipPercent };
  }
  return { receiveOwnTips: false, tipPercent: tipPercent === undefined ? undefined : null };
}

function normalizePasscode(passcode) {
  if (passcode === undefined || passcode === null) return undefined;
  const trimmed = String(passcode).trim();
  return trimmed || undefined;
}

async function assertPasscodeAvailable(restaurantId, passcode, excludeEmployeeId = null) {
  const value = normalizePasscode(passcode);
  if (!value) return undefined;

  const query = { restaurant: restaurantId, passcode: value };
  if (excludeEmployeeId) query._id = { $ne: excludeEmployeeId };

  const exists = await Employee.findOne(query).select("_id").lean();
  if (exists) {
    throw Object.assign(new Error("This passcode is already assigned to another employee"), { status: 409 });
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
        assignedFloor: employee.defaultFloor || null,
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
      .select("-password -plainPassword -passcode")
      .populate("defaultFloor", "name")
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
    const { firstName, lastName, email, countryCode, phoneNumber, role, password, status, profileImage, defaultFloor, employeeColor, defaultShiftTemplate, weeklyOff, availableDays, hourlyPaid, staffDiscount, tipPercent, receiveOwnTips, passcode } = data;

    // Validation
    if (!firstName || !lastName || !email || !phoneNumber) {
      return sendError(new Error("First name, last name, email, and phone number are required"), "Missing fields", 400);
    }

    try {
      await checkMasterManagerConflict(request.restaurant, role || "Staff");
    } catch (roleErr) {
      return sendError(roleErr, roleErr.message, roleErr.status || 400);
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

    if (Boolean(receiveOwnTips) && tipPercent !== undefined && tipPercent !== null && tipPercent !== "") {
      return sendError(
        new Error("Choose either tip percent or keep earned tips, not both"),
        "Choose either tip percent or keep earned tips, not both",
        400
      );
    }

    const tipSettings = resolveTipSettings({ receiveOwnTips, tipPercent });
    let validatedTipPercent;
    try {
      validatedTipPercent = tipSettings.receiveOwnTips
        ? undefined
        : await assertTipPercentAvailable(request.restaurant, tipSettings.tipPercent);
    } catch (tipErr) {
      return sendError(tipErr, tipErr.message, tipErr.status || 400);
    }

    let validatedPasscode;
    try {
      validatedPasscode = await assertPasscodeAvailable(request.restaurant, passcode);
    } catch (passErr) {
      return sendError(passErr, passErr.message, passErr.status || 400);
    }
    if (!validatedPasscode) {
      return sendError(new Error("Passcode is required"), "Passcode is required", 400);
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
      defaultShiftTemplate: defaultShiftTemplate || null,
      weeklyOff: weeklyOff || [],
      availableDays: availableDays || [],
      hourlyPaid: normalizedHourlyPaid,
      tipPercent: tipSettings.receiveOwnTips ? undefined : validatedTipPercent,
      receiveOwnTips: tipSettings.receiveOwnTips,
      staffDiscount: staffDiscount !== undefined ? staffDiscount : undefined,
      passcode: validatedPasscode,
    });

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
    delete employeeObj.password;
    delete employeeObj.plainPassword;
    delete employeeObj.passcode;

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
    const { _id, action, firstName, lastName, countryCode, phoneNumber, role, status, profileImage, defaultFloor, employeeColor, defaultShiftTemplate, weeklyOff, availableDays, hourlyPaid, staffDiscount, tipPercent, receiveOwnTips, passcode, employeeId, password } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Employee ID is required", 400);
    }

    // Ensure they belong to the same restaurant
    const existing = await Employee.findOne({ _id, restaurant: request.restaurant });
    if (!existing) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    if (action === "updateEmployee") {
      if (role) {
        try {
          await checkMasterManagerConflict(request.restaurant, role, _id);
        } catch (roleErr) {
          return sendError(roleErr, roleErr.message, roleErr.status || 400);
        }
      }
      
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
      if (receiveOwnTips !== undefined || tipPercent !== undefined) {
        if (Boolean(receiveOwnTips) && tipPercent !== undefined && tipPercent !== null && tipPercent !== "") {
          return sendError(
            new Error("Choose either tip percent or keep earned tips, not both"),
            "Choose either tip percent or keep earned tips, not both",
            400
          );
        }
        if (receiveOwnTips !== undefined && Boolean(receiveOwnTips)) {
          existing.receiveOwnTips = true;
          existing.tipPercent = null;
        } else if (tipPercent !== undefined && tipPercent !== null && tipPercent !== "") {
          existing.receiveOwnTips = false;
          try {
            existing.tipPercent = await assertTipPercentAvailable(request.restaurant, tipPercent, _id);
          } catch (tipErr) {
            return sendError(tipErr, tipErr.message, tipErr.status || 400);
          }
        } else if (receiveOwnTips !== undefined && !receiveOwnTips) {
          existing.receiveOwnTips = false;
          if (tipPercent !== undefined) {
            try {
              existing.tipPercent =
                tipPercent === null || tipPercent === ""
                  ? null
                  : await assertTipPercentAvailable(request.restaurant, tipPercent, _id);
            } catch (tipErr) {
              return sendError(tipErr, tipErr.message, tipErr.status || 400);
            }
          }
        } else if (tipPercent !== undefined) {
          existing.receiveOwnTips = false;
          try {
            existing.tipPercent =
              tipPercent === null || tipPercent === ""
                ? null
                : await assertTipPercentAvailable(request.restaurant, tipPercent, _id);
          } catch (tipErr) {
            return sendError(tipErr, tipErr.message, tipErr.status || 400);
          }
        }
      }
      if (passcode !== undefined && String(passcode).trim()) {
        try {
          existing.passcode = await assertPasscodeAvailable(request.restaurant, passcode, _id);
        } catch (passErr) {
          return sendError(passErr, passErr.message, passErr.status || 400);
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
      delete employeeData.passcode;
      return sendSuccess(employeeData, "Employee updated successfully");
    }

    if (action === "approve") {
      if (existing.status !== "Pending Approval") return sendError(new Error("Invalid State"), "Employee is not pending approval", 400);

      const manualEmployeeId = typeof employeeId === "string" ? employeeId.trim() : "";
      const rawPassword = typeof password === "string" ? password.trim() : "";
      if (!manualEmployeeId || !rawPassword) {
        return sendError(new Error("Missing fields"), "Employee ID and password are required", 400);
      }

      const duplicateId = await Employee.findOne({
        restaurant: request.restaurant,
        employeeId: manualEmployeeId,
        _id: { $ne: existing._id },
      }).select("_id").lean();
      if (duplicateId) {
        return sendError(new Error("Conflict"), "This Employee ID is already in use", 409);
      }

      let usernameBase = existing.firstName.toLowerCase() + "." + existing.lastName.toLowerCase();
      usernameBase = usernameBase.replace(/[^a-z0-9.]/g, "");
      let username = usernameBase;
      let counter = 1;
      while (await Employee.findOne({ restaurant: request.restaurant, username })) {
        counter++;
        username = usernameBase + counter;
      }

      const hashedPassword = await hashPassword(rawPassword);

      // Auto-create a RegisteredDevice for this employee
      const activationCode = generateActivationCode();
      await RegisteredDevice.create({
        restaurant: request.restaurant,
        deviceCode: `DEV-${Date.now()}`,
        deviceName: `${existing.firstName}'s Device`,
        deviceType: 'Tablet',
        activationCode,
        activationStatus: 'Pending',
        assignedEmployee: existing._id,
      });

      existing.employeeId = manualEmployeeId;
      existing.username = username;
      existing.password = hashedPassword;
      existing.plainPassword = rawPassword;
      existing.status = "Approved";
      existing.credentialGenerated = true;
      existing.passwordGeneratedAt = new Date();
      await existing.save();

      logger.info(`Employee Approved & Credentials Generated: ${existing.email}`);
      const employeeData = existing.toObject();
      delete employeeData.password;
      employeeData.activationCode = activationCode; // Pass back for UI
      return sendSuccess(employeeData, "Employee approved and credentials generated");
    }

    if (action === "regeneratePassword") {
      const rawPassword = typeof password === "string" ? password.trim() : "";
      if (!rawPassword) {
        return sendError(new Error("Missing fields"), "Password is required", 400);
      }
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
      const loginUrl = "https://sales.tastybitesrestaurant.com/login";

      let activationCode = null;
      const pendingDevice = await RegisteredDevice.findOne({
        restaurant: request.restaurant,
        assignedEmployee: existing._id,
        activationStatus: "Pending",
        activationCode: { $exists: true, $ne: null },
      }).sort({ createdAt: -1 });
      if (pendingDevice?.activationCode) {
        activationCode = pendingDevice.activationCode;
      }

      try {
        await sendEmployeeCredentials({
          employeeName: `${existing.firstName} ${existing.lastName}`,
          employeeId: existing.employeeId,
          username: existing.username,
          password: existing.plainPassword,
          passcode: existing.passcode || "",
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

      // 1. Retire any previous devices created for this employee
      await RegisteredDevice.updateMany(
        { assignedEmployee: existing._id, restaurant: request.restaurant },
        { status: "Retired", activationStatus: "Reset Required" }
      );

      // 2. Generate new device and activation code
      const activationCode = generateActivationCode();
      await RegisteredDevice.create({
        restaurant: request.restaurant,
        deviceCode: `DEV-${Date.now()}`,
        deviceName: `${existing.firstName}'s Device`,
        deviceType: "Tablet",
        activationCode,
        activationStatus: "Pending",
        assignedEmployee: existing._id,
      });

      existing.deviceActivationRequired = true;
      await existing.save();

      // 3. Send email with new credentials
      const restaurantModel = mongoose.model('Restaurant');
      const restaurant = await restaurantModel.findById(request.restaurant);
      const restaurantName = restaurant ? restaurant.name : "";
      const loginUrl = "https://sales.tastybitesrestaurant.com/login";

      try {
        await sendEmployeeCredentials({
          employeeName: `${existing.firstName} ${existing.lastName}`,
          employeeId: existing.employeeId,
          username: existing.username,
          password: existing.plainPassword || "******** (Password remains unchanged)",
          passcode: existing.passcode || "",
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

    if (role) {
      try {
        await checkMasterManagerConflict(request.restaurant, role, _id);
      } catch (roleErr) {
        return sendError(roleErr, roleErr.message, roleErr.status || 400);
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
      ...(defaultShiftTemplate !== undefined && { defaultShiftTemplate }),
      ...(weeklyOff !== undefined && { weeklyOff }),
      ...(availableDays !== undefined && { availableDays }),
      ...(hourlyPaid !== undefined && { hourlyPaid: normalizeHourlyPaid(hourlyPaid) }),
      ...(staffDiscount !== undefined && { staffDiscount }),
    };

    if (receiveOwnTips !== undefined || tipPercent !== undefined) {
      if (Boolean(receiveOwnTips) && tipPercent !== undefined && tipPercent !== null && tipPercent !== "") {
        return sendError(
          new Error("Choose either tip percent or keep earned tips, not both"),
          "Choose either tip percent or keep earned tips, not both",
          400
        );
      }
      if (receiveOwnTips !== undefined && Boolean(receiveOwnTips)) {
        updateData.receiveOwnTips = true;
        updateData.tipPercent = null;
      } else if (tipPercent !== undefined && tipPercent !== null && tipPercent !== "") {
        updateData.receiveOwnTips = false;
        try {
          updateData.tipPercent = await assertTipPercentAvailable(request.restaurant, tipPercent, _id);
        } catch (tipErr) {
          return sendError(tipErr, tipErr.message, tipErr.status || 400);
        }
      } else {
        if (receiveOwnTips !== undefined) updateData.receiveOwnTips = Boolean(receiveOwnTips);
        if (tipPercent !== undefined) {
          try {
            updateData.tipPercent =
              tipPercent === null || tipPercent === ""
                ? null
                : await assertTipPercentAvailable(request.restaurant, tipPercent, _id);
          } catch (tipErr) {
            return sendError(tipErr, tipErr.message, tipErr.status || 400);
          }
        }
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(_id, updateData, { new: true }).select("-password -plainPassword -passcode");

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

    await RegisteredDevice.updateMany(
      { assignedEmployee: employee._id, restaurant: request.restaurant },
      { $set: { assignedEmployee: null } }
    );

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
