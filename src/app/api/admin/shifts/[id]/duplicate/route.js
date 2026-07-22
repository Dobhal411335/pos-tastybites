import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EmployeeShift from '@/models/employee/EmployeeShift';
import { withAuth } from '@/utils/auth';

const duplicateShiftHandler = async (request, context) => {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { targetDate } = body;

    await connectDB();

    const shift = await EmployeeShift.findOne({ _id: id, restaurant: request.restaurant });
    if (!shift) {
      return NextResponse.json({ success: false, message: 'Shift not found' }, { status: 404 });
    }

    if (!targetDate) {
      return NextResponse.json({ success: false, message: 'targetDate is required for duplicating a shift' }, { status: 400 });
    }

    // Calculate new start and end times based on the target date but keeping the original hours
    const originalStart = new Date(shift.startTime);
    const newStart = new Date(targetDate);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

    let newEnd = null;
    if (shift.endTime) {
      const originalEnd = new Date(shift.endTime);
      newEnd = new Date(targetDate);
      newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), 0, 0);

      // If the original shift crossed midnight, adjust the end date by 1 day
      if (originalEnd < originalStart) {
        newEnd.setDate(newEnd.getDate() + 1);
      }
    }

    // Create duplicate
    const newShift = await EmployeeShift.create({
      employee: shift.employee,
      restaurant: shift.restaurant,
      date: new Date(targetDate),
      startTime: newStart,
      endTime: newEnd,
      assignedFloor: shift.assignedFloor,
      assignedSection: shift.assignedSection,
      assignedTables: shift.assignedTables,
      notes: shift.notes ? `Copied from shift ${id}. ${shift.notes}` : `Copied from shift ${id}.`,
      status: 'Scheduled' // Always reset to Scheduled
    });

    return NextResponse.json({ success: true, message: 'Shift duplicated successfully', data: newShift });
  } catch (error) {
    console.error('Duplicate Shift Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const POST = withAuth(duplicateShiftHandler, ['Admin', 'MANAGER']);
