import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    chatType: {
      type: String,
      enum: ["User", "Group"],
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId, // Reference to user by ID
      ref: "User",
      required: true,
    },
    // If private, this is the User ID. If group, this is the Group ID.
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "chatType", // Dynamic reference
    },

    // Content & Encryption
    content: {
      type: String,
      required: true,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },

    // Message Features
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message", // For "Reply" to specific message
      default: null,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },

    // Status tracking (Sent, Delivered, Read)
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
      type: Date, // Set when the recipient opens the chat
    },
    // We use an array for group read receipts (who read it and when)
    // readBy: [
    //   {
    //     user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    //     readAt: { type: Date, default: Date.now },
    //   },
    // ],

    // FOR GROUPS: Precise tracking per member
    // This allows the "Read by 5 people" feature
    deliveryStatus: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deliveredAt: { type: Date, default: Date.now },
        readAt: { type: Date },
      },
    ],

    // Rections
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],

    // EDITING & DELETING
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

// Indexes for high speed scrolling through chats

MessageSchema.index({ receiver: 1, chatType: 1, createdAt: -1 }); // For fetching recent messages
MessageSchema.index({ sender: 1, receiver: 1 }); // For fetching conversation between two users

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);
