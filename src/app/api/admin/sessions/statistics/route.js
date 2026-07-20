import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeSession from '@/models/EmployeeSession';
import { withAuth } from '@/utils/auth';

const getSessionStatistics = async (request) => {
  try {
    await dbConnect();
    const restaurantId = request.restaurant;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total Sessions Today
    const totalSessionsToday = await EmployeeSession.countDocuments({
      restaurant: restaurantId,
      loginTime: { $gte: today }
    });

    // 2. Current Online Employees (Active Sessions)
    const currentOnlineEmployees = await EmployeeSession.countDocuments({
      restaurant: restaurantId,
      status: 'Active'
    });

    // 3. Average Session Duration (Aggregation over today's terminated sessions)
    const avgDurationResult = await EmployeeSession.aggregate([
      {
        $match: {
          restaurant: restaurantId,
          loginTime: { $gte: today },
          status: 'Terminated',
          duration: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" } // duration is in seconds based on our logout logic
        }
      }
    ]);

    const averageSessionDuration = avgDurationResult.length > 0 
      ? Math.round(avgDurationResult[0].avgDuration) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalSessionsToday,
        currentOnlineEmployees,
        averageSessionDurationSeconds: averageSessionDuration
      }
    });
  } catch (error) {
    console.error('Session Statistics Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const GET = withAuth(getSessionStatistics, ['Admin', 'MANAGER']);
