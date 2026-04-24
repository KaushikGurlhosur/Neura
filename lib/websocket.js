import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import dbConnect from "./mongodb";
import Users from "./models/Users";
import Message from "./models/Message";
import Group from "./models/Group";

let wss = null;
const clients = new Map(); // Global map to track online users: userId -> {ws, userId}

export function initWebSocketServer(server) {
  if (wss) return wss; // Prevent multiple initializations

  wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    // 1. Extract token from URL: ws://localhost:3000?token=XYZ
    const url = new URL(req.url, `http://${req.headers.host}`); // Construct full URL to parse query params
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Unauthorized: No token provided");
      return;
    } // 1008 is the code for "Policy Violation"

    try {
      // 2. Authenticate Users
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      await dbConnect();

      // 3. Update DB status to "online"
      await Users.findByIdAndUpdate(userId, {
        status: "Online",
        lastSeen: new Date(),
      });

      // 4. Register client in our memory map
      clients.set(userId, { ws, userId });
      console.log(`✅ User ${userId} joined. Total Online: ${clients.size}`);

      // 5. Tell everyone else this user is online
      broadcastOnlineStatus(userId, true);

      // ----- MESSAGE LISTERNER -----
      ws.on("message", async (rawData) => {
        try {
          const data = JSON.parse(rawData.toString());

          switch (data.type) {
            case "private_message":
              await handlePrivateMessage(data, userId);
              break;
            case "group_message":
              await handleGroupMessage(data, userId);
              break;
            case "typing":
              await handleTyping(data, userId);
              break;
            case "read_receipt":
              await handleReadReceipt(data, userId);
              break;
            default:
              console.log("Unknown message type:", data.type);
          }
        } catch (error) {
          console.log("Failed to parse socket message:", error);
        }
      });

      // ----- DISCONNECT LISTENER -----
      ws.on("close", async () => {
        clients.delete(userId);
        console.log(`❌ User ${userId} left. Remaining: ${clients.size}`);

        await dbConnect();
        await Users.findByIdAndUpdate(userId, {
          status: "Offline",
          lastSeen: new Date(),
        });
        broadcastOnlineStatus(userId, false);
      });
    } catch (error) {
      console.error("Socket Auth Failed: ", error.message);
      ws.close(1008, "Invalid Token");
    }
  });
  return wss;
}

/**
 * 1-on-1 Chat Logic
 */
async function handlePrivateMessage(data, senderId) {
  const { receiverId, content, replyTo, tempId } = data;
  // Safety Guard: Ensure payload is valid before doing any DB operations
  if (!receiverId || typeof content !== "string" || !content.trim()) return;

  await dbConnect();

  // Create message in DB
  const newMessage = await Message.create({
    chatType: "User",
    sender: senderId,
    receiver: receiverId,
    content: content.trim(),
    replyTo: replyTo || null,
    status: "sent",
  });

  const populated = await newMessage.populate(
    "sender receiver",
    "name avatar username",
  );

  // Send to recipient if they are online
  const recipient = clients.get(receiverId);
  if (recipient && recipient.ws.readyState === 1) {
    recipient.ws.send(
      JSON.stringify({ type: "new_message", message: populated }),
    );
    // Update status to delivered immediately since they are online
    newMessage.status = "delivered";
    newMessage.deliveredAt = new Date();
    await newMessage.save();
  }

  // Send confirmation back to sender so their UI updates from "pending" to "sent"
  const sender = clients.get(senderId);
  if (sender) {
    sender.ws.send(
      JSON.stringify({
        type: "message_sent_confirm",
        message: populated,
        tempId: tempId, // Send back the UUID so UI can sync
      }),
    );
  }
}

/**
 * Group Chat Logic
 */
async function handleGroupMessage(data, senderId) {
  const { groupId, content, temptId } = data;

  // Guard 1: Input Validation
  if (!groupId || typeof content !== "string" || !content.trim()) return;

  await dbConnect();

  const group = await Group.findById(groupId);
  if (!group || !group.members.some((m) => m.user.toString() === senderId))
    return; // User must be a member to send messages

  const newMessage = await Message.create({
    chatType: "Group",
    sender: senderId,
    receiver: groupId,
    content: content.trim(),
    deliveryStatus: group.members
      .filter((m) => m.user.toString() !== senderId) // Excluding the sender from delivery status
      .map((m) => ({ user: m.user })), // Initialize delivery status for each member
  });

  const populated = await newMessage.populate("sender", "name avatar username");

  // Broadcast to all online members
  const onlineInGroup = [];
  group.members.forEach((member) => {
    const memberId = member.user.toString();

    if (memberId === senderId) return; // Skip sender

    const client = clients.get(memberId);

    if (client && client.ws.readyState === 1) {
      onlineInGroup.push(member.user);
      client.ws.send(
        JSON.stringify({ type: "group_message", message: populated, groupId }), // Send full message object so clients can update
      );
    }
  });

  // Bulk update delivery for those currently online
  if (onlineInGroup.length > 0) {
    await Message.updateOne(
      { _id: newMessage._id },
      { $set: { "deliveryStatus.$[elem].deliveredAt": new Date() } },
      { arrayFilters: [{ "elem.user": { $in: onlineInGroup } }] },
    );
  }

  // Update last message in Group model
  await Group.findByIdAndUpdate(groupId, { lastMessage: newMessage._id });

  // Confirmation to sender (Essential for "pending" UI state)
  const sender = clients.get(senderId);
  if (sender) {
    sender.ws.send(
      JSON.stringify({
        type: "message_sent_confirm",
        message: populated,
        tempId: temptId,
        groupId: groupId,
      }),
    );
  }
}

/**
 * Typing Indicator (Broadcasting intent)
 */

function handleTyping(data, senderId) {
  const { receiverId, groupId, isTyping } = data;

  if (receiverId) {
    const recipient = clients.get(receiverId);
    if (recipient && recipient.ws.readyState === 1) {
      recipient.ws.send(
        JSON.stringify({ type: "typing", userId: senderId, isTyping }),
      );
    }
  } else if (groupId) {
    // For groups, broadcast to everyone except the person typing
    clients.forEach((client) => {
      if (client.userId !== senderId && client.ws.readyState === 1) {
        client.ws.send(
          JSON.stringify({
            type: "group_typing",
            groupId,
            userId: senderId,
            isTyping,
          }),
        );
      }
    });
  }
}

/**
 * Update Read Status
 */
async function handleReadReceipt(data, userId) {
  const { messageId, chatType } = data;
  await dbConnect();

  if (chatType === "User") {
    await Message.findByIdAndUpdate(messageId, {
      status: "read",
      readAt: new Date(),
    });
  } else {
    await Message.updateOne(
      { _id: messageId, "deliveryStatus.user": userId },
      { $set: { "deliveryStatus.$.readAt": new Date() } },
    );
  }
}

/**
 * Online/Offline Broadcaster
 */
function broadcastOnlineStatus(userId, isOnline) {
  const payload = JSON.stringify({
    type: "status_update",
    userId,
    isOnline,
    lastSeen: new Date(),
  });

  clients.forEach((client) => {
    if (client.userId !== userId && client.ws.readyState === 1) {
      client.ws.send(payload);
    }
  });
}
