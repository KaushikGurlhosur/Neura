import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users from "@/lib/models/Users";

export async function GET(request) {
  try {
    await dbConnect();
    // 1. EXTRACT TOKEN FROM COOKIES
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 401 },
      );
    }

    // 2. VERIFY THE JWT
    // This confirms the token was actually signed by Neura's server.

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. FETCH FRESH DATA FROM DB
    // We fetch the user by ID (from the token payload).
    // Note: We do NOT select '+password' here because the frontend never needs it.
    const user = await Users.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account no longer exists.",
        },
        { status: 404 },
      );
    }

    // 4. CLEAN & PREPARE RESPONSE
    // We use a plain object to ensure we only send non-sensitive fields.

    const userObj = user.toObject();

    const { password, security, __v, ...userResponse } = userObj; // Exclude sensitive/internal fields

    // Mapping _id to a clean "id" string for the frontend
    userResponse.id = userObj._id.toString();

    return NextResponse.json(
      {
        success: true,
        user: userResponse,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Auth check error: ", error);
    return NextResponse.json(
      {
        success: false,
        message: "Session expired or invalid token.",
      },
      { status: 401 },
    );
  }
}
