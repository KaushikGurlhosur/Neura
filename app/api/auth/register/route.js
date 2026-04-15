import Users from "@/lib/models/Users";
import dbConnect from "@/lib/mongodb";
import { sendVerificationOTP } from "@/utils/otp";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await dbConnect();

    const { name, username, password, email, phoneNumber, bio } =
      await request.json();

    // Check if user exists

    // 1. NORMALIZE & SEARCH
    const searchCriteria = [];
    if (email) searchCriteria.push({ email: email.toLowerCase().trim() });
    if (phoneNumber) searchCriteria.push({ phoneNumber: phoneNumber.trim() });
    if (username)
      searchCriteria.push({ username: username.toLowerCase().trim() });

    const existingUser = await Users.findOne({
      $or: searchCriteria,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User with the provided email, phone number, or username already exists",
        },
        { status: 400 },
      );
    }

    // Errors
    const errors = [];
    if (!name || name.trim().length < 3) {
      errors.push("Name must be at least 3 characters long.");
    }
    if (!username || username.trim().length < 3) {
      errors.push("Username must be at least 3 characters long.");
    }
    if (!password || password.trim().length < 8) {
      errors.push("Password mucst be at least 8 characters long.");
    }
    if (!email && !phoneNumber) {
      errors.push("Either email or phone number is required");
    }

    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push("Invalid email format");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation errors",
          errors,
        },
        { status: 400 },
      );
    }

    // CREATE UNVERIFIED USER
    const newUser = await Users.create({
      name,
      username: username.toLowerCase().trim(),
      password: password.trim(),
      email: email?.toLowerCase().trim(),
      phoneNumber,
      bio: bio || "Hey there! I am using Neura.",
      isVerified: false,
    });

    // TRIGGER OTP & HANDLE FAILURE (The Rollback)
    const otpResult = await sendVerificationOTP(newUser.email, newUser.name);

    if (!otpResult.success) {
      await Users.findByIdAndDelete(newUser._id);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send verification email. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: newUser.toJSON(),
        requiresVerification: true,
        // Pass devOTP only in development mode for easy testing
        ...(process.env.NODE_ENV === "development" && {
          devOTP: otpResult.devOTP,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to register user",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
