import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeShift from '@/models/EmployeeShift';
import { withAuth } from '@/utils/auth'; // Using the standard auth for admins

const getShiftsHandler = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employee');

    const filter = { restaurant: request.restaurant };

    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (status) filter.status = status;
    if (employeeId) filter.employee = employeeId;

    const shifts = await EmployeeShift.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('assignedFloor', 'name')
      .populate('assignedSection', 'name')
      .populate('assignedTables', 'name')
      .sort({ startTime: 1 });

    return NextResponse.json({ success: true, data: shifts });
  } catch (error) {
    console.error('Fetch Shifts Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

const createShiftHandler = async (request) => {
  try {
    const body = await request.json();
    const { employee, date, startTime, endTime, assignedFloor, assignedSection, assignedTables, notes } = body;

    if (!employee || !date || !startTime) {
      return NextResponse.json({ success: false, message: 'Employee, date, and start time are required' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;

    if (end && start >= end) {
      return NextResponse.json({ success: false, message: 'Start time must be before end time' }, { status: 400 });
    }

    // Check overlap logic (Optional based on business rules, but good practice)
    const existingShift = await EmployeeShift.findOne({
      employee,
      status: { $in: ['Scheduled', 'Active'] },
      $or: [
        { startTime: { $lt: end || new Date('2099-01-01') }, endTime: { $gt: start } }, // General overlap
        { date: new Date(date) } // Strict rule: only one shift per day per employee? (Let's stick to overlapping times)
      ]
    });

    if (existingShift) {
      return NextResponse.json({ success: false, message: 'Employee already has a conflicting shift' }, { status: 409 });
    }

    const shift = await EmployeeShift.create({
      employee,
      restaurant: request.restaurant,
      date: new Date(date),
      startTime: start,
      endTime: end,
      assignedFloor,
      assignedSection,
      assignedTables,
      notes,
      status: 'Scheduled'
    });

    return NextResponse.json({ success: true, message: 'Shift created successfully', data: shift });
  } catch (error) {
    console.error('Create Shift Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const GET = withAuth(getShiftsHandler, ['Admin', 'MANAGER']);
export const POST = withAuth(createShiftHandler, ['Admin', 'MANAGER']);
