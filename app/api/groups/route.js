import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Group from "@/lib/models/Group";

export async function GET(request) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Decode token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECERET);

    // Find any group where the "members" array contains an object with out user ID
    const groups = await Group.find({
      "members.user": decoded.userId,
    })
      .populate("members.user", "name username avatar") // Replace IDs with actual user data
      .populate("creator", "name username avatar")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, groups });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new group chat

export async function POST(request) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { name, memberIds, avatar, requiresApproval } = await request.json();

    if (!name || !memberIds || memberIds.length === 0) {
      return NextResponse.json(
        {
          error: "Group name and members are required",
        },
        { status: 400 },
      );
    }

    // Construct the membership list
    // The creator is automatically added as an admin.
    const members = [
      {
        user: decoded.userId,
        role: "admin",
        joinedAt: new Date(),
      },
      ...memberIds.map((id) => ({
        user: id,
        role: "member",
        joinedAt: new Date(),
      })),
    ];

    const group = await Group.create({
      name,
      avatar:
        avatar || "https://cdn-icons-png.flaticon.com/512/1946/1946429.png",
      creator: decoded.userId,
      members,
      memberCount: members.length,
      requiresApproval: requiresApproval || false,
    });

    return NextResponse.json({ success: true, group });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
