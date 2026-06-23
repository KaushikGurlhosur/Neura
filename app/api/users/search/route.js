import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db"; // Adjust path to match your layout database bootstrapper
import User from "@/models/User";
import { getSessionUser } from "@/lib/auth"; // Adjust path to match your session helper

export async function GET(request) {
  try {
    await dbConnect();
    const currentUser = await getSessionUser();
    if (!currentUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 1 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase();

    if (!query || query.length < 3) {
      return NextResponse.json({ users: [] });
    }

    // Lookup matches ignoring the current authenticated user's profile
    const users = await User.find({
      _id: { $ne: currentUser.id },
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phoneNumber: { $regex: query, $options: "i" } },
      ],
    })
      .select("name username email avatar bio")
      .limit(10);

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Query Error" },
      { status: 500 },
    );
  }
}
