import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users from "@/lib/models/Users";

export async function GET(request) {
  try {
    await dbConnect();
    // 1. EXTRACT TOKEN FROM COOKIES
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 401 },
      );
    }

    // 2. VERIFY THE JWT
    // This confirms the token was actually signed by Neura's server.

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. FETCH FRESH DATA FROM DB
    // We fetch the user by ID (from the token payload).
    // Note: We do NOT select '+password' here because the frontend never needs it.
    const user = await Users.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account no longer exists.",
        },
        { status: 404 },
      );
    }

    // 4. CLEAN & PREPARE RESPONSE
    // We use a plain object to ensure we only send non-sensitive fields.

    const userObj = user.toObject();

    const { password, security, __v, ...userResponse } = userObj; // Exclude sensitive/internal fields

    // Mapping _id to a clean "id" string for the frontend
    userResponse.id = userObj._id.toString();

    return NextResponse.json(
      {
        success: true,
        user: userResponse,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Auth check error: ", error);
    return NextResponse.json(
      {
        success: false,
        message: "Session expired or invalid token.",
      },
      { status: 401 },
    );
  }
}

export async function PUT(request) {
  try {
    await dbConnect();

    // 1. Authenticate the user
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 },
      );
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Parse the incoming data (Name and Bio)
    const body = await request.json();
    const { name, bio } = body;

    // Basic Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Display name cannot be empty." },
        { status: 400 },
      );
    }

    // 3. Update the database
    // $set ensures we ONLY update name and bio, preventing users from hacking their email/phone fields
    const updatedUser = await Users.findByIdAndUpdate(
      decoded.userId,
      {
        $set: {
          name: name.trim(),
          bio: bio.trim(),
        },
      },
      { new: true, runValidators: true }, // Returns the newly updated document
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully!",
        user: {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          username: updatedUser.username,
          bio: updatedUser.bio,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Profile update error: ", error);
    return NextResponse.json(
      { success: false, message: "Failed to update profile." },
      { status: 500 },
    );
  }
}
