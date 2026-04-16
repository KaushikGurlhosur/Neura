import Users from "@/lib/models/Users";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request) {
  try {
    await dbConnect();

    // Identifier can be either email or username
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Email/Username and Password are required" },
        { status: 400 },
      );
    }

    // 1. Find user by email OR username
    // We use .select('+password') because the Schema marks it as hidden (select: false)

    const user = await Users.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.toLowerCase().trim() },
      ],
    }).select("+password");

    // 2. Generic Error Message
    // Senior tip: Using "Invalid credentials" instead of "User not found"
    // prevents hackers from "fishing" for valid email addresses.
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      );
    }

    // 5. PASSWORD VALIDATION

    const isValid = await user.comparePassword(password);

    if (!isValid) {
      user.security = user.security || {}; // Ensure security object exists
      user.security.failedAttempts = (user.security.failedAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.security.failedAttempts >= 5) {
        user.security.isLocked = true;
        user.security.lockUntil = new Date(Date.now() + 60 * 60 * 1000); // Lock for 60 minutes
      }
      await user.save();
      return NextResponse.json(
        {
          success: false,
          message: "invalid credentials",
        },
        { status: 401 },
      );
    }

    // 3. CHECK LOCK STATUS (Timed "Lazy" Unlock)
    if (user.security?.isLocked) {
      const now = new Date();

      // If the lock timer has expired, unlock the account automatically
      if (user.security.lockUntil && user.security.lockUntil < now) {
        user.security.isLocked = false;
        user.security.failedAttempts = 0;
        user.security.lockUntil = null;
        await user.save();
      } else {
        // STILL LOCKED: Calculate remaining minutes for the user
        const remainingMs = user.security.lockUntil - now; // Time left in milliseconds
        const remainingMins = Math.ceil(remainingMs / (60 * 1000));

        return NextResponse.json(
          {
            success: false,
            message: `Account locked for security reasons. Please try again in ${remainingMins} minutes or contact support.`,
          },
          { status: 401 },
        );
      }
    }
    // 4. VERIFICATION GUARD
    // If they have the right password but never did the OTP, stop them here.
    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Account not verified.",
          requiresVerification: true,
          userId: user._id,
        },
        { status: 401 },
      );
    }

    // 6. LOGIN SUCCESS: Reset security logs & update activity
    if (user.security) {
      user.security.failedAttempts = 0;
      user.security.isLocked = false;
      user.security.lockUntil = null;
    }
    user.lastSeen = new Date();
    await user.save();

    // 7. JWT GENERATION
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 8. RESPONSE & COOKIE SETTING
    // strip the sensitive 'password' and 'security' objects from the response
    const { password: _, security: __, ...userResponse } = user.toObject();

    const response = NextResponse.json({
      success: true,
      message: "Welcome back!",
      user: userResponse,
      token, // For frontend state
    });

    // We set an HTTP-Only cookie.
    // This is automatically sent by the browser for Middleware and WebSockets.
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/", // Cookie available across the entire site
    });

    return response;
  } catch (error) {
    console.error("Login error: ", error);
    return NextResponse.json(
      {
        success: false,
        message: "Login failed due to server error",
      },
      { status: 500 },
    );
  }
}
