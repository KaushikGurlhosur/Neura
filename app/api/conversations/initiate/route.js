import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Conversation from "@/lib/models/Conversation";

export async function POST(request) {
  try {
    await dbConnect();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target definition is required" },
        { status: 400 },
      );
    }

    if (currentUserId === targetUserId) {
      return NextResponse.json(
        {
          error: "Self-Thread generation is blocked",
        },
        { status: 400 },
      );
    }

    // Verify if an active thread pair already exists
    let conversation = await Conversation.findOne({
      chatType: "User",
      participants: { $all: [currentUserId, targetUserId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        chatType: "User",
        participants: [currentUserId, targetUserId],
        participantSettings: [
          { user: currentUserId, unreadCount: 0 },
          { user: targetUserId, unreadCount: 0 },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      conversationId: converstion._id,
    });
  } catch (error) {
    console.error("Error initiating conversation:", error);
    return NextResponse.json(
      {
        error: "Failed to build conversation",
      },
      { status: 500 },
    );
  }
}
