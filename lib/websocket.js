import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import dbConnect from "./mongodb";
import Users from "./models/Users";
import Message from "./models/Message";

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
      wss.close(1008, "Unauthorized: No token provided");
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
  const { receiverId, content, replyTo } = data;
  if (!receiverId || !content) return;

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
      JSON.stringify({ type: "message_sent_confirm", message: populated }),
    );
  }
}
