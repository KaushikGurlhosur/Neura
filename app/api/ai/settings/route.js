// File: app/api/ai/settings/route.js
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Conversation from "@/lib/models/Conversation";

export async function POST(request) {
  try {
    await dbConnect();

    const token = request.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;

    const body = await request.json();
    const { conversationId, mode, persona } = body;

    if (!conversationId)
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 },
      );

    const updatedConversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, "participantSettings.user": currentUserId },
      {
        $set: {
          "participantSettings.$.aiAutopilot.mode": mode,
          "participantSettings.$.aiAutopilot.persona": persona,
        },
      },
      { new: true },
    );

    if (!updatedConversation)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "AI Settings Saved" });
  } catch (error) {
    console.error("AI Settings Save Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
