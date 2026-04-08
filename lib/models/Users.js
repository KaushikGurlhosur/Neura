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
      required: [true, "User name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: [true, "Email must be Unique"],
      sparse: true, // Allows multiple documents with null email
      trim: true,
    },
    phoneNumber: {
      type: Number,
      unique: true,
      sparse: true, // Allows multiple documents with null phoneNumber
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
  },
  { timestamps: true },
);

// Hash password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
