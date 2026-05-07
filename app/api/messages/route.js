import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("userId"); // The person you clicked on to view messages
    const limit = parseInt(searchParams.get("limit") || "50");

    // We search for messages where:
    // (Sender is ME AND Receiver is THEM) OR (Sender is THEM AND Receiver is ME)
    const messages = await Message.find({
      chatType: "User",
      $or: [
        { sender: decoded.userId, receiver: otherUserId },
        { sender: otherUserId, receiver: decoded.userId },
      ],
      isDeleted: false, //
    })
      .populate("sender", "name username avatar")
      .populate("receiver", "name username avatar")
      .sort({ createdAt: 1 }) // Chronological order (oldest to newest)
      .limit(limit);

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
