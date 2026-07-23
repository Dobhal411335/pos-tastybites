import { withAuth } from "@/utils/auth";
import EmployeeShift from "@/models/employee/EmployeeShift";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";
import Floor from "@/models/floor/Floor";
import Table from "@/models/floor/Table";
import RegisteredDevice from "@/models/RegisteredDevice";
import ShiftTemplate from "@/models/employee/ShiftTemplate";

// Helper function to recalculate all shifts for an employee in a given week
async function calculateWeeklyHours(employeeId, restaurantId, targetDate) {
  const d = new Date(targetDate);
  const day = d.getDay();
  // Set to previous Monday (or today if Monday). If Sunday (0), go back 6 days.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  const startOfWeek = new Date(d);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const shifts = await EmployeeShift.find({
    employee: employeeId,
    restaurant: restaurantId,
    date: { $gte: startOfWeek, $lte: endOfWeek }
  }).sort({ startTime: 1 });

  let cumulativeHours = 0;
  const bulkOps = [];

  for (const shift of shifts) {
    if (!shift.endTime) continue; // Can't calculate without end time

    const durationMs = shift.endTime.getTime() - shift.startTime.getTime();
    const shiftTotalHours = durationMs / (1000 * 60 * 60);

    let reg = shiftTotalHours;
    let ot = 0;

    if (cumulativeHours >= 40) {
      ot = shiftTotalHours;
      reg = 0;
    } else if (cumulativeHours + shiftTotalHours > 40) {
      reg = 40 - cumulativeHours;
      ot = shiftTotalHours - reg;
    }

    cumulativeHours += shiftTotalHours;

    bulkOps.push({
      updateOne: {
        filter: { _id: shift._id },
        update: { 
          totalHours: Number(shiftTotalHours.toFixed(2)), 
          regularHours: Number(reg.toFixed(2)), 
          overtimeHours: Number(ot.toFixed(2)) 
        }
      }
    });
  }

  if (bulkOps.length > 0) {
    await EmployeeShift.bulkWrite(bulkOps);
  }
}

// GET - List all shifts or templates
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const action = searchParams.get("action");

    if (action === "templates") {
      const templates = await ShiftTemplate.find({ restaurant: request.restaurant }).lean();
      return sendSuccess(templates, "Templates retrieved successfully");
    }

    const query = { restaurant: request.restaurant };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    const shifts = await EmployeeShift.find(query)
      .populate("employee", "firstName lastName email role")
      .populate("assignedFloor", "name")
      .populate("assignedTables", "tableNumber capacity")
      .populate("assignedDevice", "deviceName")
      .populate({ path: "templateId", strictPopulate: false })
      .lean();

    return sendSuccess(shifts, "Shifts retrieved successfully");
  } catch (error) {
    logger.error("Failed to list shifts", error);
    return sendError(error, "Failed to retrieve shifts", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create new shift(s) or template or copy week
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { action } = data;

    if (action === "createTemplate") {
      const { name, startTime, endTime, color, workingDays, repeatPattern } = data;
      if (!name || !startTime || !endTime) return sendError(new Error("Missing fields"), "Name, start time, and end time required", 400);
      const newTemplate = await ShiftTemplate.create({ 
        restaurant: request.restaurant, 
        name, startTime, endTime, 
        color: color || "blue",
        workingDays: workingDays || [],
        repeatPattern: repeatPattern || "Weekly"
      });
      return sendSuccess(newTemplate, "Template created successfully", 201);
    }

    if (action === "updateTemplate") {
      const { _id, name, startTime, endTime, color, workingDays, repeatPattern } = data;
      if (!_id || !name || !startTime || !endTime) return sendError(new Error("Missing fields"), "ID, name, start time, and end time required", 400);
      
      const template = await ShiftTemplate.findOne({ _id, restaurant: request.restaurant });
      if (!template) return sendError(new Error("Not Found"), "Template not found", 404);
      
      template.name = name;
      template.startTime = startTime;
      template.endTime = endTime;
      template.color = color || "blue";
      template.workingDays = workingDays || [];
      template.repeatPattern = repeatPattern || "Weekly";
      
      await template.save();
      return sendSuccess(template, "Template updated successfully", 200);
    }

    if (action === "copyWeek") {
      const { sourceWeekStart, targetWeekStart } = data;
      if (!sourceWeekStart || !targetWeekStart) return sendError(new Error("Missing fields"), "Source and Target week start required", 400);

      const sStart = new Date(sourceWeekStart);
      sStart.setHours(0,0,0,0);
      const sEnd = new Date(sStart);
      sEnd.setDate(sEnd.getDate() + 6);
      sEnd.setHours(23,59,59,999);

      const existingShifts = await EmployeeShift.find({ restaurant: request.restaurant, date: { $gte: sStart, $lte: sEnd } }).lean();
      
      const dayDiffMs = new Date(targetWeekStart).getTime() - sStart.getTime();
      const newShifts = existingShifts.map(s => {
        const nDate = new Date(new Date(s.date).getTime() + dayDiffMs);
        const nStartTime = new Date(new Date(s.startTime).getTime() + dayDiffMs);
        const nEndTime = s.endTime ? new Date(new Date(s.endTime).getTime() + dayDiffMs) : null;
        return {
          employee: s.employee,
          restaurant: s.restaurant,
          date: nDate,
          startTime: nStartTime,
          endTime: nEndTime,
          shiftType: s.shiftType,
          templateId: s.templateId,
          status: "Scheduled",
          notes: s.notes
        };
      });

      if (newShifts.length > 0) {
        await EmployeeShift.insertMany(newShifts);
        // Recalc unique employees
        const uniqueEmp = [...new Set(newShifts.map(s => s.employee.toString()))];
        for (const eId of uniqueEmp) {
          await calculateWeeklyHours(eId, request.restaurant, new Date(targetWeekStart));
        }
      }
      return sendSuccess(null, `Copied ${newShifts.length} shifts to new week`, 201);
    }

    if (action === "applyTemplateEngine") {
      const { templateId, employeeIds, startDate, endDate } = data;
      
      const template = await ShiftTemplate.findById(templateId);
      if (!template) return sendError(new Error("Not Found"), "Template not found", 404);

      const employees = await mongoose.model("Employee").find({ _id: { $in: employeeIds }, restaurant: request.restaurant });
      if (employees.length !== employeeIds.length) return sendError(new Error("Not Found"), "One or more employees not found", 404);

      const shiftStartTemplate = new Date(`1970-01-01T${template.startTime}:00`);
      const shiftEndTemplate = new Date(`1970-01-01T${template.endTime}:00`);

      const startD = new Date(startDate);
      startD.setHours(0,0,0,0);
      const endD = new Date(endDate);
      endD.setHours(23,59,59,999);

      const shiftsToCreate = [];
      let skippedCount = 0;

      for (const emp of employees) {
        let currentDate = new Date(startD);
        while (currentDate <= endD) {
          const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

          let shouldSchedule = true;
          if (emp.weeklyOff && emp.weeklyOff.includes(dayOfWeek)) shouldSchedule = false;
          if (emp.availableDays && emp.availableDays.length > 0 && !emp.availableDays.includes(dayOfWeek)) shouldSchedule = false;
          if (emp.leaveStatus && emp.leaveStatus !== 'None') shouldSchedule = false;
          if (template.workingDays && template.workingDays.length > 0 && !template.workingDays.includes(dayOfWeek)) shouldSchedule = false;

          if (shouldSchedule) {
            const sTime = new Date(currentDate);
            sTime.setHours(shiftStartTemplate.getHours(), shiftStartTemplate.getMinutes(), 0, 0);

            const eTime = new Date(currentDate);
            eTime.setHours(shiftEndTemplate.getHours(), shiftEndTemplate.getMinutes(), 0, 0);
            if (eTime <= sTime) eTime.setDate(eTime.getDate() + 1);

            shiftsToCreate.push({
              employee: emp._id,
              restaurant: request.restaurant,
              date: new Date(currentDate),
              startTime: sTime,
              endTime: eTime,
              status: "Scheduled",
              shiftType: "Regular",
              templateId: template._id,
              assignedFloor: emp.assignedFloor || emp.defaultFloor || null,
              assignedTables: emp.assignedTables || []
            });
          } else {
            skippedCount++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      if (shiftsToCreate.length === 0) {
        return sendError(new Error("Validation"), "No shifts could be scheduled due to availability constraints.", 400);
      }

      const insertedShifts = await EmployeeShift.insertMany(shiftsToCreate);

      // Recalc unique employees weeks
      const uniqueEmp = [...new Set(shiftsToCreate.map(s => s.employee.toString()))];
      const uniqueWeeks = [...new Set(shiftsToCreate.map(s => {
        const d = new Date(s.date);
        const day = d.getDay();
        return new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))).toISOString();
      }))];

      for (const uEmp of uniqueEmp) {
        for (const wDate of uniqueWeeks) {
          await calculateWeeklyHours(uEmp, request.restaurant, new Date(wDate));
        }
      }

      logger.info(`Bulk applyTemplateEngine shifts created: ${insertedShifts.length}`);
      return sendSuccess(insertedShifts, `Scheduled ${insertedShifts.length} shift(s). Skipped ${skippedCount} due to availability/working days.`, 201);
    }

    let { employeeIds, employeeId, date, startTime, endTime, status, notes, shiftType, templateId, repeatUntil } = data;

    if (!employeeIds && employeeId) employeeIds = [employeeId];

    if (!employeeIds || employeeIds.length === 0 || !date || !startTime) {
      return sendError(new Error("Missing fields"), "Employees, date, and start time are required", 400);
    }

    const shiftStartTemplate = new Date(startTime);
    const shiftEndTemplate = endTime ? new Date(endTime) : null;

    const startDate = new Date(date);
    const endDate = repeatUntil ? new Date(repeatUntil) : new Date(date);

    const employees = await Employee.find({ _id: { $in: employeeIds }, restaurant: request.restaurant });
    if (employees.length !== employeeIds.length) {
      return sendError(new Error("Not Found"), "One or more employees not found", 404);
    }

    const shiftsToCreate = [];
    const daysToSchedule = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      daysToSchedule.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let skippedCount = 0;

    for (const emp of employees) {
      for (const targetDate of daysToSchedule) {
        const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (emp.leaveStatus && emp.leaveStatus !== 'None') { skippedCount++; continue; }
        if (emp.weeklyOff && emp.weeklyOff.includes(dayOfWeek)) { skippedCount++; continue; }
        if (emp.availableDays && emp.availableDays.length > 0 && !emp.availableDays.includes(dayOfWeek)) { skippedCount++; continue; }

        const sTime = new Date(targetDate);
        sTime.setHours(shiftStartTemplate.getHours(), shiftStartTemplate.getMinutes(), 0, 0);

        let eTime = null;
        if (shiftEndTemplate) {
          eTime = new Date(targetDate);
          eTime.setHours(shiftEndTemplate.getHours(), shiftEndTemplate.getMinutes(), 0, 0);
          if (eTime <= sTime) {
            eTime.setDate(eTime.getDate() + 1); // overnight
          }
        }

        shiftsToCreate.push({
          employee: emp._id,
          restaurant: request.restaurant,
          date: targetDate,
          startTime: sTime,
          endTime: eTime,
          status: status || "Scheduled",
          notes: notes || "",
          shiftType: shiftType || "Regular",
          templateId: templateId || null
        });
      }
    }

    if (shiftsToCreate.length === 0) {
      return sendError(new Error("Validation"), "No shifts could be scheduled due to availability constraints.", 400);
    }

    const insertedShifts = await EmployeeShift.insertMany(shiftsToCreate);

    const uniqueEmp = [...new Set(shiftsToCreate.map(s => s.employee.toString()))];
    const uniqueWeeks = [...new Set(shiftsToCreate.map(s => {
      const d = new Date(s.date);
      const day = d.getDay();
      return new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))).toISOString();
    }))];

    for (const uEmp of uniqueEmp) {
      for (const wDate of uniqueWeeks) {
        await calculateWeeklyHours(uEmp, request.restaurant, new Date(wDate));
      }
    }

    logger.info(`Bulk shifts created: ${insertedShifts.length}`);
    return sendSuccess(insertedShifts, `Scheduled ${insertedShifts.length} shift(s). Skipped ${skippedCount} due to availability.`, 201);
  } catch (error) {
    logger.error("Failed to create shift", error);
    return sendError(error, "Failed to create shift", 500);
  }
}, ["ADMIN", "MANAGER"]);

// PUT - Update shift
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { _id, startTime, endTime, assignedFloor, assignedSection, assignedTables, assignedDevice, status, notes } = data;

    if (!_id) {
      return sendError(new Error("Missing ID"), "Shift ID is required", 400);
    }

    const existingShift = await EmployeeShift.findOne({ _id, restaurant: request.restaurant });
    if (!existingShift) {
      return sendError(new Error("Not Found"), "Shift not found", 404);
    }

    const updateData = {};
    if (startTime) {
      updateData.startTime = new Date(startTime);
    }
    if (endTime) {
      updateData.endTime = new Date(endTime);
      if (updateData.startTime && updateData.startTime >= updateData.endTime) {
        return sendError(new Error("Invalid Time"), "End time must be after start time", 400);
      } else if (!updateData.startTime && existingShift.startTime >= updateData.endTime) {
        return sendError(new Error("Invalid Time"), "End time must be after existing start time", 400);
      }
    }
    
    if (assignedFloor !== undefined) updateData.assignedFloor = assignedFloor;
    if (assignedSection !== undefined) updateData.assignedSection = assignedSection;
    if (assignedTables !== undefined) updateData.assignedTables = assignedTables;
    if (assignedDevice !== undefined) updateData.assignedDevice = assignedDevice;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (data.shiftType) updateData.shiftType = data.shiftType;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;

    await EmployeeShift.findByIdAndUpdate(_id, updateData);
    
    // Recalculate hours for the week containing this shift
    await calculateWeeklyHours(existingShift.employee, request.restaurant, existingShift.date);

    const updatedShift = await EmployeeShift.findById(_id)
      .populate("employee", "firstName lastName email role");

    logger.info(`Shift updated for employee ${existingShift.employee}`);
    return sendSuccess(updatedShift, "Shift updated successfully");
  } catch (error) {
    logger.error("Failed to update shift", error);
    return sendError(error, "Failed to update shift", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove shift or template
export const DELETE = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (!id) {
      return sendError(new Error("Missing ID"), "ID is required", 400);
    }

    if (action === "template") {
      const deletedTemplate = await ShiftTemplate.findOneAndDelete({ _id: id, restaurant: request.restaurant });
      if (!deletedTemplate) return sendError(new Error("Not Found"), "Template not found", 404);
      return sendSuccess(null, "Template deleted successfully");
    }

    const deletedShift = await EmployeeShift.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    
    if (!deletedShift) {
      return sendError(new Error("Not Found"), "Shift not found", 404);
    }

    // Recalculate hours for the week to remove this shift's hours from the totals
    await calculateWeeklyHours(deletedShift.employee, request.restaurant, deletedShift.date);

    logger.info(`Shift deleted: ${id}`);
    return sendSuccess(null, "Shift deleted successfully");
  } catch (error) {
    logger.error("Failed to delete shift", error);
    return sendError(error, "Failed to delete shift", 500);
  }
}, ["ADMIN", "MANAGER"]);
