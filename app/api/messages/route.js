import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Message from "@/lib/models/Message";
import Conversation from "@/lib/models/Conversation";

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
    const targetId = searchParams.get("userId"); // The person you clicked on to view messages
    if (!targetId) {
      return NextResponse.json(
        { success: false, message: "Missing target userId" },
        { status: 400 },
      );
    }

    const MAX_LIMIT = 100;
    const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_LIMIT)
        : 50;

    // We search for messages where:
    // We search for a 1-on-1 thread containing exactly you and the target user
    let conversation = await Conversation.findOne({
      chatType: "User",
      participants: { $all: [currentUserId, targetId], $size: 2 },
    });

    // Auto-create the room if it doesn't exist yet (first message)
    if (!conversation) {
      conversation = await Conversation.create({
        chatType: "User",
        participants: [currentUserId, targetId],
        participantSettings: [
          {
            user: currentUserId,
            aiAutopilot: { mode: "off", persona: "friendly" },
          },
          { user: targetId, aiAutopilot: { mode: "off", persona: "friendly" } },
        ],
      });
    }

    const mySettingsNode = conversation.participantSettings.find(
      (setting) => setting.user.toString() === currentUserId,
    );

    const extractedAiSettings = mySettingsNode?.aiAutopilot || {
      mode: "off",
      persona: "friendly",
    };

    // FETCH MESSAGES: We fetch messages where either you sent it to them, or they sent it to you.
    const messages = (
      await Message.find({
        chatType: "User",
        isDeleted: false,
        $or: [
          { conversationId: conversation._id },
          {
            $or: [
              { sender: currentUserId, receiver: targetId },
              { sender: targetId, receiver: currentUserId },
            ],
          },
        ],
      })
        .populate("sender", "name username avatar")
        .populate("receiver", "name username avatar")
        .sort({ createdAt: -1 }) // newest first so limit keeps the most recent
        .limit(limit)
    ).reverse(); // present oldest → newest to the client

    return NextResponse.json({
      success: true,
      conversationId: conversation._id,
      aiSettings: extractedAiSettings,
      messages,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST message
export async function POST(request) {
  try {
    await dbConnect();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;

    // Parse the body from ChatWindow.js
    const body = await request.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: "Missing receiverId or content" },
        { status: 400 },
      );
    }

    let conversation = await Conversation.findOne({
      chatType: "User",
      participants: [currentUserId, receiverId],
      participantsSettings: [
        {
          user: currentUserId,
        },
        { user: receiverId },
      ],
    });

    // 1. Create message in MongoDB
    const newMessage = await Message.create({
      chatType: "User",
      sender: currentUserId,
      receiver: receiverId,
      content: content.trim(),
      status: "sent",
    });

    // ─── UPDATE SIDEBAR PREVIEW ──────────────────────────────────────────
    // 🟢 ADDED: Keep the thread updated with the latest message data
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // 2. Populate sender so frontend has user details (avatar, name)
    const populatedMessage = await newMessage.populate(
      "sender",
      "name username avatar",
    );

    // 3. RETURN JSON (This prevents the SyntaxError)
    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error("POST Message Error:", error);

    // Handle JWT errors specifically
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
