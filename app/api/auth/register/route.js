import Users from "@/lib/models/Users";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await dbConnect();

    const { name, username, password, email, phoneNumber, bio } =
      await request.json();

    // Check if user exists

    const searchCriteria = [];
    if (email) searchCriteria.push({ email });
    if (phoneNumber) searchCriteria.push({ phoneNumber });
    if (username) searchCriteria.push({ username });

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
    if (!password || password.length < 8) {
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

    const newUser = await Users.create({
      name,
      username,
      password,
      email,
      phoneNumber,
      bio,
    });

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: newUser.toJSON(),
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
