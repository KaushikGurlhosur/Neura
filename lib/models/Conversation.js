import mongoose from "mongoose";

// 🟢 HIGHLIGHTED CHANGE: Brand new collection mapping WhatsApp-style communication threads.
const ConversationSchema = new mongoose.Schema(
  {
    chatType: {
      type: String,
      enum: ["User", "Group"], // Matches your existing Message naming standards exactly
      required: true,
    },

    // An array containing references to all users locked inside this specific room
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // If chatType is "Group", this holds a reference to your original Group document
    groupRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    // WhatsApp Style Optimization fields for high-speed sidebar rendering
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // ─── ISOLATED AI & META PARAMETERS PER PARTICIPANT ────────────────────
    // WHY: This array isolates settings so that User A can have Autopilot on 'full'
    // while User B keeps it completely 'off' inside the exact same chat thread.
    participantSettings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        unreadCount: {
          type: Number,
          default: 0, // Clears the need to query thousands of messages to calculate notification counters
        },
        isMuted: {
          type: Boolean,
          default: false,
        },
        // Embedded Autopilot Configuration Node mapped precisely to our UI states
        aiAutopilot: {
          mode: {
            type: String,
            enum: ["off", "partial", "full"], // Matches frontend strings
            default: "off",
          },
          persona: {
            type: String,
            enum: ["friendly", "professional", "flirty", "cryptic"], // Matches frontend options
            default: "friendly",
          },
          contextWindow: {
            type: Number,
            default: 20, // Looks back at the last 20 messages for context when drafting replies
          },
        },
      },
    ],
  },
  { timestamps: true },
);

// High-performance indexing for the server
// Allows NestJS to instantly locate a thread given the list of active participants
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
