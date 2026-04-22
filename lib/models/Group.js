import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50,
    },
    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/1946/1946429.png",
    },

    // Admin & Membership
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["admin", "moderator", "member"],
          default: "member",
        },
        joinedAt: { type: Date, default: Date.now }, // For tracking when they joined the group
      },
    ],

    // Limits & Settings
    maxMembers: {
      type: Number,
      default: 500,
    },
    memberCount: {
      type: Number,
      default: 1,
    },

    // Admin only toggle: can members send messages or only admins?
    isReadOnlyForMembers: {
      type: Boolean,
      default: false,
    },

    // Does an admin need to approve new join requests?
    requiresApproval: {
      type: Boolean,
      default: false,
    },

    // --- INVITE SYSTEM ---
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // Only exists if the group is joinable via link
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true },
);

// Middleware to keep memberCount in sync automatically
GroupSchema.pre("save", function (next) {
  if (this.isModified("members")) {
    this.memberCount = this.members.length;
  }
  next();
});
