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
  const record = await OTP.findOne({
    email,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }); // Get the latest OTP

  if (!record) {
    return {
      success: false,
      message: "OTP expired or not found. Please resend.",
    };
  }

  // Check attempts
  if (record.attempts >= 3) {
    await OTP.deleteOne({ _id: record._id });
    return {
      success: false,
      message: "Too many attempts. Please request a new OTP.",
    };
  }

  // Compare OTP
  if (record.otp === userInputOtp) {
    record.isUsed = true;
    await record.save();
    return { success: true, message: "OTP verified successfully." };
  } else {
    record.attempts += 1;
    await record.save();

    return {
      success: false,
      message: `Wrong code. ${3 - record.attempts} attempts remaining.`,
    };
  }
}
