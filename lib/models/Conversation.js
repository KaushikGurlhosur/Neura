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
            min: [1, "contextWindow must be at least 1 message"],
            max: [
              200,
              "contextWindow cannot exceed 200 messages for performance bounds",
            ],
          },
        },
      },
    ],
  },
  { timestamps: true },
);

// ─── 🟢 CODEFIX: ADVANCED SCHEMA-LEVEL STATE VALIDATOR ───────────────────
// This running interceptor prevents structurally malformed rooms or corrupted
// user metadata profiles from ever entering your database pipelines.

ConversationSchema.pre("validate", function (next) {
  // 1. Ensure at least 2 participants for a valid conversation thread
  if (this.participants.length !== 2) {
    throw new Error("A conversation must have exactly 2 participants.");
  }
  if (this.groupRef) {
    throw new Error("Direct User conversation cannot contain a groupRef index");
  }

  if (this.chatType === "Group") {
    if (this.participants.length < 1) {
      throw new Error(
        "Group conversations must contain at least 1 active participant",
      );
    }
    if (!this.groupRef) {
      throw new Error(
        "Group type conversations require a valid groupRef binding object",
      );
    }
  }

  // 2. Validate participantSettings Uniqueness & Room Membership Alignment
  const settingsUserIds = this.participantSettings.map((setting) =>
    setting.user.toString(),
  ); // Extract user IDs from participantSettings for validation
  const uniqueSettingsUsers = new Set(settingsUserIds); // Create a Set to check for duplicates

  if (settingsUserIds.length !== uniqueSettingsUsers.size) {
    throw new Error(
      "Vulnerability Blocked: Duplicate user entries detected inside participantSettings array",
    );
  }

  const coreRoomParticipantIds = this.participants.map((p) => p.toString()); // Extract participant user IDs for validation
  const participantSet = new Set(coreRoomParticipantIds); // Create a Set for efficient lookup of active participants

  for (const userId of settingsUserIds) {
    if (!participantSet.has(userId)) {
      throw new Error(
        "Data Leak Blocked: participantSettings contains a user ID who is not an active participant in this room",
      );
    }
  }
});

// High-performance indexing for the server
// Allows NestJS to instantly locate a thread given the list of active participants
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
