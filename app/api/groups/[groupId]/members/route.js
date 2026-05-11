import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Group from "@/lib/models/Group";
import Users from "@/lib/models/Users";

/**
 * GET - Fetch all members of a group
 * Used to show the "Group Info" sidebar with the list of participants.
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    const { groupId } = await params;

    // Security check: Find the group and ensure the person asking is a member.
    // We populate the 'user' field within the members array to get their profile details.
    const group = await Group.findOne({
      _id: groupId,
      "members.user": decoded.userId,
    }).populate("members.user", "name username avatar bio status lastSeen");

    if (!group) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      members: group.members,
    });
  } catch (error) {
    console.error("Error in GET /api/groups/[groupId]/members:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

/**
 * POST - Add new members to group (Admin/Moderator only)
 * Used when you click "Add Participants" in the UI.
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    const { groupId } = await params;
    const { memberIds } = await request.json(); // Array of User IDs to add

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds array is required" },
        { status: 400 },
      );
    }

    // Authorization Check: Only Admins or Moderators can add people.
    const group = await Group.findOne({
      _id: groupId,
      "members.user": decoded.userId,
      "members.role": { $in: ["admin", "moderator"] },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Only admins/moderators can add members" },
        { status: 403 },
      );
    }

    const existingMemberIds = group.members.map((m) => m.user.toString());

    // Filter logic: Don't add someone who is already in the group.
    const newMemberIds = memberIds.filter(
      (id) => !existingMemberIds.includes(id),
    );

    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { error: "All specified users are already members" },
        { status: 400 },
      );
    }

    // DB Validation: Ensure all IDs actually exist in our Users collection.
    const validUsers = await Users.find({
      _id: { $in: newMemberIds },
      isVerified: true,
    });

    if (validUsers.length !== newMemberIds.length) {
      return NextResponse.json(
        { error: "One or more user IDs are invalid" },
        { status: 400 },
      );
    }

    // Add the new members with the default 'member' role.
    const newMembers = newMemberIds.map((id) => ({
      user: id,
      role: "member",
      joinedAt: new Date(),
    }));

    group.members.push(...newMembers);
    group.memberCount = group.members.length; // Sync the count
    await group.save();

    return NextResponse.json({
      success: true,
      message: `${newMembers.length} member(s) added successfully`,
    });
  } catch (error) {
    console.error("Error in POST /api/groups/[groupId]/members:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update member role (Admin only)
 * Used for promoting someone to Admin or Moderator.
 */
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    const { groupId } = await params;
    const { memberId, role } = await request.json();

    if (!role || !["admin", "moderator", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, moderator, or member" },
        { status: 400 },
      );
    }

    const { Types } = await import("mongoose");
    if (!memberId || !Types.ObjectId.isValid(memberId)) {
      return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
    }

    // Check if the current user is the "Super Admin" of the group
    const group = await Group.findOne({
      _id: groupId,
      "members.user": decoded.userId,
      "members.role": "admin",
    });

    if (!group)
      return NextResponse.json(
        { error: "Only admins can update roles" },
        { status: 403 },
      );

    // Rule: You cannot change the role of the person who originally created the group.
    if (group.creator.toString() === memberId) {
      return NextResponse.json(
        { error: "Cannot change the creator's role" },
        { status: 400 },
      );
    }

    const memberIndex = group.members.findIndex(
      (m) => m.user.toString() === memberId,
    );
    if (memberIndex === -1)
      return NextResponse.json({ error: "Member not found" }, { status: 404 });

    group.members[memberIndex].role = role;
    await group.save();

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`,
    });
  } catch (error) {
    console.error("Error in PUT /api/groups/[groupId]/members:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Remove member from group (Admin remove or Self-Leave)
 * Handles both "Kick" and "Exit Group" functionality.
 */
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const token = request.cookies.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    const { groupId } = await params;
    const memberId = new URL(request.url).searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 },
      );
    }

    const { Types } = await import("mongoose");
    if (!Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { error: "Invalid member ID format" },
        { status: 400 },
      );
    }

    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const isSelfLeave = memberId === decoded.userId;
    const isAdmin = group.members.some(
      (m) => m.user.toString() === decoded.userId && m.role === "admin",
    );

    // Logic: You can leave yourself, but you can only remove others if you are an admin.
    if (!isSelfLeave && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Rule: You can't kick the creator.
    if (group.creator.toString() === memberId && !isSelfLeave) {
      return NextResponse.json(
        { error: "Cannot remove creator" },
        { status: 400 },
      );
    }

    // Filter the members array to exclude the target user.
    group.members = group.members.filter((m) => m.user.toString() !== memberId);
    group.memberCount = group.members.length;

    // If the group is now empty, delete the group entirely.
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return NextResponse.json({ success: true, message: "Group deleted" });
    }

    // Fallback: If an admin leaves and no admins are left, promote the next person in line.
    if (isAdmin && isSelfLeave) {
      const remainingAdmins = group.members.some((m) => m.role === "admin");
      if (!remainingAdmins && group.members.length > 0) {
        group.members[0].role = "admin";
      }
    }

    await group.save();
    return NextResponse.json({
      success: true,
      message: isSelfLeave ? "Left group" : "Member removed",
    });
  } catch (error) {
    console.error("Error in DELETE /api/groups/[groupId]/members:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}
