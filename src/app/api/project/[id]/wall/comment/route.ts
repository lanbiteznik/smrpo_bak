import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

// GET handler to retrieve comments for a specific wall post
export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const comments = await prisma.post_comment.findMany({
      where: {
        wall_post_id: parseInt(postId),
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            lastname: true,
            username: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST handler to create a new comment
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const projectId = parseInt(rawId, 10);
    const body = await request.json();
    const { description, person_id, wall_post_id } = body;

    if (!description || !wall_post_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if post exists and belongs to the specified project
    const post = await prisma.wall_post.findFirst({
      where: {
        id: wall_post_id,
        project_id: projectId,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await prisma.post_comment.create({
      data: {
        description,
        person_id: parseInt(person_id),
        wall_post_id,
        created_at: new Date(),
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE handler to remove a comment
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const projectId = parseInt(rawId, 10);
    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get("comment_id");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    // Get the comment to check ownership
    const comment = await prisma.post_comment.findUnique({
      where: {
        id: parseInt(commentId),
      },
      include: {
        wall_post: {
          select: {
            project_id: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Verify the comment belongs to the specified project
    if (comment.wall_post && comment.wall_post.project_id !== projectId) {
      return NextResponse.json(
        { error: "Comment does not belong to this project" },
        { status: 403 }
      );
    }

    // Delete the comment
    await prisma.post_comment.delete({
      where: {
        id: parseInt(commentId),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
