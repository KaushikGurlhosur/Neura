import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    // 🟢 HIGHLIGHTED CHANGE: Appended conversationId to support thread normalization
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      index: true, // Crucial for ultra-fast timeline scrolling queries
    },
    chatType: {
      type: String,
      enum: ["User", "Group"],
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "chatType",
    },
    content: {
      type: String,
      required: true,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    deliveryStatus: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deliveredAt: { type: Date, default: Date.now },
        readAt: { type: Date },
      },
    ],
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Optimizing indexes for threaded communication
MessageSchema.index({ conversationId: 1, createdAt: -1 }); // 🟢 ADDED: Allows instant chronological rendering per chat thread
MessageSchema.index({ receiver: 1, chatType: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, receiver: 1 });

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);
