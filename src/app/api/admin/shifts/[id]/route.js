import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeShift from '@/models/EmployeeShift';
import { withAuth } from '@/utils/auth';

const updateShiftHandler = async (request, context) => {
  try {
    const { id } = context.params;
    const body = await request.json();
    
    await dbConnect();
    
    const shift = await EmployeeShift.findOne({ _id: id, restaurant: request.restaurant });
    if (!shift) {
      return NextResponse.json({ success: false, message: 'Shift not found' }, { status: 404 });
    }

    // Business rule: If setting to Active, ensure no other Active shift exists for this employee
    if (body.status === 'Active' && shift.status !== 'Active') {
      const activeShift = await EmployeeShift.findOne({
        employee: shift.employee,
        status: 'Active',
        _id: { $ne: shift._id }
      });
      
      if (activeShift) {
        return NextResponse.json({ success: false, message: 'Employee already has an active shift' }, { status: 409 });
      }
    }

    // Update fields securely
    const allowedUpdates = ['assignedFloor', 'assignedSection', 'assignedTables', 'startTime', 'endTime', 'status', 'notes'];
    allowedUpdates.forEach(field => {
      if (body[field] !== undefined) {
        shift[field] = body[field];
      }
    });

    if (shift.startTime && shift.endTime && new Date(shift.startTime) >= new Date(shift.endTime)) {
      return NextResponse.json({ success: false, message: 'Start time must be before end time' }, { status: 400 });
    }

    await shift.save();

    return NextResponse.json({ success: true, message: 'Shift updated successfully', data: shift });
  } catch (error) {
    console.error('Update Shift Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

const deleteShiftHandler = async (request, context) => {
  try {
    const { id } = context.params;
    
    await dbConnect();

    const shift = await EmployeeShift.findOne({ _id: id, restaurant: request.restaurant });
    if (!shift) {
      return NextResponse.json({ success: false, message: 'Shift not found' }, { status: 404 });
    }

    // Business rule: Cannot delete Active or Completed shifts
    if (['Active', 'Completed'].includes(shift.status)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Cannot delete an active or completed shift. Please cancel it instead.' 
      }, { status: 403 });
    }

    await EmployeeShift.deleteOne({ _id: id });

    return NextResponse.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Delete Shift Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const PUT = withAuth(updateShiftHandler, ['Admin', 'MANAGER']);
export const DELETE = withAuth(deleteShiftHandler, ['Admin', 'MANAGER']);
