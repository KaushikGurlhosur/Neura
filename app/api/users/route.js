import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users from "@/lib/models/Users";

export async function GET(request) {
  try {
    await dbConnect();

    // Extract token from HTTP-only cookies for security
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Decode token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;

    // Fetch Users:
    // 1. $ne (Not equal) excludes the requester
    // 2. isVerified: true ensures we don't show unactivated accounts
    const users = await Users.find({
      _id: { $ne: currentUserId },
      isVerified: true,
    }).select("_id name username email phoneNumber avatar bio status lastSeen");

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users: ", error); // 2. CHANGE: Check for specific JWT verification failures
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 },
      );
    }

    // 3. CHANGE: Use a generic message for all other errors (500)
    // Never return 'error.message' here as it can leak database details
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
