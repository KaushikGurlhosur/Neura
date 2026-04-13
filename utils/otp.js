import OTP from "@/lib/models/OTP";
import { sendOTPEmail } from "@/lib/services/emailService";

export function generateOTP() {
  // Generate a 6-digit OTP with characters and numbers
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return otp;
}

export async function sendVerificationOTP(email, name) {
  // Delete old unused OTPs for this email
  await OTP.deleteMany({ email, isUsed: false });

  // Geerate new OTP
  const otp = generateOTP();

  // Save OTP to database
  await OTP.create({ email, otp });

  // Send email using Brevo
  const result = await sendOTPEmail(email, otp, name);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: "OTP sent successfully",
    devOTP: process.env.NODE_ENV === "development" ? otp : undefined,
  };
}

export async function verifyOTP(email, userInputOtp) {
  // 2. NORMALIZATION: Users might type lowercase 'a1b2' instead of 'A1B2'.
  const normalizeOTP = String(userInputOtp).trim().toUpperCase();
  const now = new Date(); // Get current time

  // ATOMICITY: We use findOneAndUpdate to prevent "Race Conditions"
  // This first check tries to find and consume the CORRECT OTP in one step.
  const matched = await OTP.findOneAndUpdate(
    {
      email,
      otp: normalizeOTP,
      isUsed: false,
      expiresAt: { $gt: now }, // Check if OTP is still valid
      attempts: { $lt: 3 }, // Limit to 3 attempts
    },
    { $set: { isUsed: true } },
    { sort: { createdAt: -1 }, new: true },
  );

  if (matched) {
    return { success: true, message: "OTP verified successfully." };
  }

  // 4. ATOMIC INCREMENT: If no match, increment attempts on the latest active OTP.
  const record = await OTP.findOneAndUpdate(
    {
      email,
      isUsed: false,
      expiresAt: { $gt: now },
      attempts: { $lt: 3 },
    },
    { $inc: { attempts: 1 } },
    { sort: { createdAt: -1 }, new: true },
  );

  if (!record) {
    return {
      success: false,
      message: "OTP expired or not found. Please resend.",
    };
  }

  // 5. AUTO-DELETION: If the 3rd attempt just failed, clean up.
  if (record.attempts >= 3) {
    await OTP.deleteOne({ _id: record._id });
    return {
      success: false,
      message: "Too many attempts. Please request a new OTP.",
    };
  }

  return {
    success: false,
    message: `Wrong code. ${3 - record.attempts} attempts remaining.`,
  };
}
