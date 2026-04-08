import Users from "@/lib/models/Users";
import dbConnect from "@/lib/mongodb";

export async function POST(request) {
  try {
    await dbConnect();

    const userData = await request.json();

    // Creating a test user
    const user = await Users.create(userData);

    return Response.json(
      {
        success: true,
        message: "Test user created successfully",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating test user: ", error);
    return Response.json(
      {
        message: "Failed to create test user",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await dbConnect();

    const users = await Users.find().select("-password").limit(100);
    return Response.json(
      {
        success: true,
        message: "Test users fetched successfully",
        users,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching test user: ", error);
    return Response.json(
      {
        message: "Failed to fetch test user",
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
