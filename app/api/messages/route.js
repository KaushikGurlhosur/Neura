import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Message from "@/lib/models/Message";

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
    if (!otherUserId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
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
    // (Sender is ME AND Receiver is THEM) OR (Sender is THEM AND Receiver is ME)

    const messages = (
      await Message.find({
        chatType: "User",
        $or: [
          { sender: decoded.userId, receiver: otherUserId },
          { sender: otherUserId, receiver: decoded.userId },
        ],
        isDeleted: false,
      })
        .populate("sender", "name username avatar")
        .populate("receiver", "name username avatar")

        .sort({ createdAt: -1 }) // newest first so limit keeps the most recent
        .limit(limit)
    ).reverse(); // present oldest → newest to the client

    return NextResponse.json({ success: true, messages });
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

    // Parse the body from ChatWindow.js
    const body = await request.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: "Missing receiverId or content" },
        { status: 400 },
      );
    }

    // 1. Create message in MongoDB
    const newMessage = await Message.create({
      chatType: "User",
      sender: decoded.userId,
      receiver: receiverId,
      content: content.trim(),
      status: "sent",
    });

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
