import Users from "@/lib/models/Users";
import dbConnect from "@/lib/mongodb";
import { verifyOTP } from "@/utils/otp";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request) {
  try {
    await dbConnect();
    const { userId, otp } = await request.json();

    if (!userId || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID and OTP are required for verification.",
        },
        { status: 400 },
      );
    }

    // Find the user
    const user = await Users.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, message: "User is already verified" },
        { status: 400 },
      );
    }

    // Verify OTP
    const result = await verifyOTP(user.email, otp);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 400 },
      );
    }

    // Mark user as verified
    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      {
        isVerified: true,
        verifiedAt: new Date(),
        $set: { "billing.credits": 50 }, // Give 50 free credits on verification
      },
      { new: true },
    );

    // Generate JWT token for auto login
    const token = jwt.sign(
      {
        userId: updatedUser?._id,
        email: updatedUser?.email,
        username: updatedUser?.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Cleaning response to avoid sending sensitive info
    const { password, ...userResponse } = updatedUser.toObject();

    return NextResponse.json({
      success: true,
      message: "Welcome to Neura! Account verified and 50 credits granted.",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("OTP verification error: ", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "OTP verification failed due to server error",
      },
      { status: 500 },
    );
  }
}
