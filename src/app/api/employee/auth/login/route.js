import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Mock validation
    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Missing credentials" }, { status: 400 });
    }

    // Mock token creation
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-for-development');
    const token = await new SignJWT({ 
      id: "mock-employee-id", 
      email, 
      name: "Staff Member",
      role: "WAITER"
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(secret);

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: { name: "Staff Member", email, role: "WAITER" }
    });

    response.cookies.set({
      name: "employee-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
