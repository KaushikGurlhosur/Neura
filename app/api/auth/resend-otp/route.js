import Users from "@/lib/models/Users";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { sendVerificationOTP } from "@/lib/utils/otp";

export async function POST(request) {
  try {
    await dbConnect();

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required to resend OTP." },
        { status: 400 },
      );
    }

    // Find the user in DB
    const user = await Users.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, message: "User is already verified." },
        { status: 400 },
      );
    }

    // Resend OTP
    const resendOTPResult = await sendVerificationOTP(user.email, user.name);

    // Handle email service failure
    if (!resendOTPResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send verification code. Please try again later.",
        },
        { status: 500 },
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        message: resendOTPResult.message,
        ...(process.env.NODE_ENV === "development" && {
          devOTP: resendOTPResult.devOTP,
        }),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Resend OTP error: ", error?.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to resend OTP. An internal error occured.",
      },
      { status: 500 },
    );
  }
}
