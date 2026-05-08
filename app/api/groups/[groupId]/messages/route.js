import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Group from "@/lib/models/Group";
import Message from "@/lib/models/Message";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { groupId } = await params;

    // SECURITY CHECK:
    // Don't just fetch messages—ensure the person asking is actually in the group!
    const group = await Group.findOne({
      _id: groupId,
      "members.user": decoded.userId,
    });

    if (!group) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // In groups, the "receiver" field stores the Group ID
    const messages = await Message.find({
      chatType: "Group",
      receiver: groupId,
      isDeleted: false,
    })
      .populate("sender", "name username avatar")
      .sort({ createdAt: 1 })
      .limit(50);

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
