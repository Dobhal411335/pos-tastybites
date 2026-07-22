import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EmployeeSession from '@/models/employee/EmployeeSession';
import { withAuth } from '@/utils/auth';

const getSessionsList = async (request) => {
  try {
    await connectDB();
    const restaurantId = request.restaurant;
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employee');
    const dateStr = searchParams.get('date'); // specific date

    const query = { restaurant: restaurantId };

    if (status) query.status = status;
    if (employeeId) query.employee = employeeId;
    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      query.loginTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const sessions = await EmployeeSession.find(query)
      .populate('employee', 'firstName lastName employeeId profileImage')
      .populate('device', 'name type browserFingerprint')
      .populate('shift', 'startTime endTime')
      .sort({ loginTime: -1 }) // most recent first
      .skip(skip)
      .limit(limit);

    const total = await EmployeeSession.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fetch Sessions Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const GET = withAuth(getSessionsList, ['Admin', 'MANAGER']);
