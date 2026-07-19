import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(request) {
  try {
    const token = request.cookies.get("employee-token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-for-development');
    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
  }
}
