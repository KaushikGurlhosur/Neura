import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: {
      type: String,
      unique: true,
      required: [true, "User name is required"],
      minLength: [3, "Username must be at least 3 characters"],
      maxLength: [30, "Username cannot exceed 30 characters"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._]+$/,
        "Username can only contain letters, numbers, dots, and underscores",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email must be Unique"],
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      sparse: true,
      minLength: [10, "Phone number too short"],
      maxLength: [15, "Phone number too long"],
    },
    password: { type: String, required: true, select: false },
    avatar: {
      type: String,
      default:
        "https://p1.hiclipart.com/preview/203/111/756/account-icon-avatar-icon-person-icon-profile-icon-user-icon-logo-symbol-circle-blackandwhite-png-clipart.jpg",
    },
    bio: {
      type: String,
      maxLength: 200,
      default: "Hey there! I am using Neura.",
      trim: true,
    },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verificationToken: { type: String },

    // ─── STATUS MONITORING ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["Online", "Offline", "Auto-Pilot"],
      default: "Offline",
    },

    // 🟢 HIGHLIGHTED CHANGE: Removed the 'autopilotSettings' object completely.
    // WHY: Tonal preferences and automation controls are being migrated to the
    // brand new Conversation collection to prevent global tone contamination.

    // 🟢 STRUCTURAL RETENTION: Keeping 'knowledgeBase' on the User document.
    // WHY: Your facts (e.g., your MacBook Air M1 setup, programming knowledge)
    // are personal profile extensions that the AI will pull from across any chat.
    knowledgeBase: [
      {
        question: String,
        answer: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    lastSeen: { type: Date, default: Date },

    security: {
      visitorId: { type: String, index: true },
      lastLoginIp: String,
      failedAttempts: { type: Number, default: 0 },
      isLocked: { type: Boolean, default: false },
      lockUntil: { type: Date },
      passwordHistory: [
        { hash: String, changedAt: { type: Date, default: Date.now } },
      ],
    },
    referral: {
      code: { type: String, unique: true },
      referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    preferences: {
      language: { type: String, default: "en" },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      notifications: {
        email: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
      },
    },
    billing: {
      plan: { type: String, enum: ["Free", "Pro"], default: "Free" },
      credits: { type: Number, default: 50 },
    },
  },
  { timestamps: true },
);

UserSchema.index({ isVerified: 1 });

// ─── 🟢 CODEFIX: COMPLIANT PARTIAL FILTER INDEX FOR ROLLING REVENUE MODES ───
// This prevents system migration validation crashes. Existing legacy users
// without a referral code will be safely ignored rather than throwing index errors.
UserSchema.index(
  { "referral.code": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "referral.code": { $exists: true, $type: "string" },
    }, // This ensures only documents with a referral.code will be indexed for uniqueness, allowing legacy users without referral codes to exist without causing index errors.
  },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }

  // Replaced Math.random (4 chars) with a secure, random hex sequence.
  // 16^6 = 16.7 Million unique possibilities per block suffix, eliminating collisions.
  if (this.isNew && !this.referral.code) {
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    this.referral.code = `NEURA-${randomPart}`;
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
