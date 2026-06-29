import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Conversation from "@/lib/models/Conversation";

export async function GET(request) {
  try {
    await dbConnect();

    // 1. Authenticate Request
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;

    // 2. Fetch all conversations where you are participant
    const conversation = await Conversation.find({
      participants: currentUserId,
    })
      .populate("participants", "name username avatar status lastSeen")
      .populate("lastMessage", "content createdAt status")
      .sort({ lastMessageAt: -1 });

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error("Fetch Conversations Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
