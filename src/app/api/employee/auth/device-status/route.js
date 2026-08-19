import { NextResponse } from 'next/server';
import { getDeviceAuthContext } from '@/utils/deviceAuth';

export async function GET() {
  try {
    const ctx = await getDeviceAuthContext();
    return NextResponse.json({
      success: true,
      registered: Boolean(ctx?.device),
    });
  } catch (error) {
    return NextResponse.json({ success: true, registered: false });
  }
}
