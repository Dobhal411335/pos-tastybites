import { NextResponse } from 'next/server';
import { withEmployeeAuth } from '@/utils/employeeAuth';
import EmployeeShift from '@/models/employee/EmployeeShift';
import Floor from"@/models/floor/Floor"
const getMeHandler = async (request) => {
  try {
    const employee = request.employee;
    const session = request.session;

    // Fetch the currently active shift to return to the client
    const activeShift = await EmployeeShift.findById(session.shift).populate('assignedFloor assignedSection');

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phoneNumber: employee.phoneNumber,
          role: employee.role,
          joinDate: employee.createdAt,
          profileImage: employee.profileImage,
          permissions: employee.permissionGroup?.permissions || []
        },
        shift: activeShift ? {
          id: activeShift._id,
          startTime: activeShift.startTime,
          assignedFloor: activeShift.assignedFloor?.name || null,
          assignedSection: activeShift.assignedSection?.name || null
        } : null
      }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const GET = withEmployeeAuth(getMeHandler);
