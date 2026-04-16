import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Define the User Schema
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
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
      type: String, // Highly recommended to change from Number to String
      required: [true, "Phone number is required"],
      unique: true,
      sparse: true,
      minLength: [10, "Phone number too short"],
      maxLength: [15, "Phone number too long"], // Caps international formats
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

    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: { type: Date },
    verificationToken: { type: String },

    // AutoPILOT section
    status: {
      type: String,
      enum: ["Online", "Offline", "Auto-Pilot"],
      default: "Offline",
    },
    autopilotSettings: {
      mode: {
        type: String,
        enum: ["Professional", "Flirt", "Friendly", "Off"],
        default: "Off",
      },
      contextWindow: {
        type: Number,
        default: 48, // Default to 48 hours
      },
      isLearning: { type: Boolean, default: true },
    },

    knowledgeBase: [
      {
        question: String,
        answer: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // Security & Compliance
    security: {
      visitorId: { type: String, index: true },
      lastLoginIp: String,
      failedAttempts: { type: Number, default: 0 },
      isLocked: { type: Boolean, default: false },
      lockUntil: { type: Date }, // Time when account becomes usable again after lockout
      passwordHistory: [
        {
          hash: String,
          changedAt: { type: Date, default: Date.now },
        },
      ],
    },

    // Metadata for Growth
    referral: {
      code: { type: String, unique: true },
      referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // Personalized Preferences
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

    // Credits (Monetization Layer)
    billing: {
      plan: { type: String, enum: ["Free", "Pro"], default: "Free" },
      credits: { type: Number, default: 50 }, // Your "50 Free Credits"
    },
  },
  { timestamps: true },
);

// Create indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ isVerified: 1 });

// Hash password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }

  // 2. The Referral Code Generator (New Part)
  // this.isNew is TRUE only when the user is being created for the first time
  if (this.isNew && !this.referral.code) {
    // Math.random().toString(36) creates a random string like "0.a1b2c3d4"
    // .substring(2, 6) takes 4 characters from it
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.referral.code = `NEURA-${randomPart}`;
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
