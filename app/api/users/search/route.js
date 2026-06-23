import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function GET(request) {
  try {
    await dbConnect();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 3) {
      return NextResponse.json({ users: [] });
    }

    // Escape Regex to prevent ReDoS (The CodeRabbit Fix)
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Lookup matches ignoring the current authenticated user's profile

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
        { phoneNumber: { $regex: escapedQuery, $options: "i" } },
      ],
    })
      .select("name username email avatar bio")
      .limit(10);

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Query Error" },
      { status: 500 },
    );
  }
}
