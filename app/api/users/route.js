import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users from "@/lib/models/Users";
import Message from "@/lib/models/Message";

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
    // Get all direct messages involving current user

    const messages = await Message.find({
      chatType: "User",
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    }).sort({ createdAt: -1, _id: -1 });

    // // Extract unique chat partner IDs + latest message per partner in one pass

    const userIds = new Set();
    const lastMessageByPartner = new Map();
    const currentId = String(currentUserId);

    for (const msg of messages) {
      const senderId = msg.sender.toString();
      const receiverId = msg.receiver.toString();
      const otherUserId = senderId === currentId ? receiverId : senderId;

      if (otherUserId === currentId) continue;
      userIds.add(otherUserId);

      // Messages is already sorted in descending order, so the first seen is the latest
      if (!lastMessageByPartner.has(otherUserId)) {
        lastMessageByPartner.set(otherUserId, msg); // this line saves latest message of a user
      }
    }

    // Fetch only users involved in chats
    const users = await Users.find({
      _id: { $in: [...userIds] },
      isVerified: true,
    }).select("_id name username email phoneNumber avatar bio status lastSeen");

    // Attach latest message for each user
    const usersWithLastMessage = users.map((user) => {
      const lastMessage = lastMessageByPartner.get(user._id.toString() || null);

      return {
        ...user.toObject(),
        lastMessage: lastMessage
          ? {
              _id: lastMessage._id,
              content: lastMessage.content,
              sender: lastMessage.sender,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithLastMessage,
      currentUserId,
    });
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
