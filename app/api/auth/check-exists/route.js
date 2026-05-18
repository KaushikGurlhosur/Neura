import Users from "@/lib/models/Users";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await dbConnect();

    const { field, value } = await request.json();

    if (!field || !value) {
      return NextResponse.json({ exists: false });
    }

    let query = {};
    if (field === "email") {
      query.email = value.toLowerCase().trim();
    } else if (field === "phoneNumber") {
      query.phoneNumber = value.trim();
    } else if (field === "username") {
      query.username = value.toLowerCase().trim();
    }

    const existingUser = await Users.findOne(query);

    return NextResponse.json({ exists: !!existingUser }); // !! is used to convert to boolean
  } catch (error) {
    return NextResponse.json(
      {
        exists: false,
        message: "User doesn't exists.",
      },
      { status: 404 },
    );
  }
}
