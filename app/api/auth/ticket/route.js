import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// export const dynamic = "force-dynamic"; // 🟢 ADD THIS: Forces Next.js to generate a fresh ticket every single time

export async function GET(request) {
  try {
    // 1. Read the secure httpOnly cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No token provided." },
        { status: 401 },
      );
    }

    // 2. Verify they are actually logged in
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. GENERATE THE TICKET (The Boarding pass)
    const wsTicket = jwt.sign(
      {
        userId: decoded.userId,
        isWsTicket: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30s" },
    );

    return NextResponse.json(
      {
        success: true,
        ticket: wsTicket,
        message: "WebSocket boarding pass issued.",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
}
