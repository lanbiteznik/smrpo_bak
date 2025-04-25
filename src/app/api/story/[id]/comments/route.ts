import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

// GET endpoint to retrieve comments for a story
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const storyId = parseInt(rawId, 10);

    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    // First get the story to find its project_id
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });
    
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Find wall post for this story's project
    const wallPost = await prisma.wall_post.findFirst({
      where: {
        project_id: story.project_id
      }
    });

    if (!wallPost) {
      // No comments yet
      return NextResponse.json([]);
    }

    // Get comments for this wall post
    const allComments = await prisma.post_comment.findMany({
      where: {
        wall_post_id: wallPost.id
      },
      orderBy: { created_at: 'asc' },
      include: {
        person: {
          select: {
            name: true,
            lastname: true,
            username: true,
          },
        },
      },
    });

    // Remove the explicit type annotation and handle null values
    const formattedComments = allComments.map((comment) => ({
      id: comment.id,
      content: comment.description?.toString() || '', // Ensure string conversion
      created_at: comment.created_at || new Date(), // Handle potential null value
      author_id: comment.person_id || 0,
      author_name: comment.person 
        ? `${comment.person.name} ${comment.person.lastname}` 
        : 'Unknown User',
      author: comment.person
    }));

    return NextResponse.json(formattedComments);
  } catch (error) {
    console.error('Error fetching all comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const storyId = parseInt(rawId, 10);
    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as number;
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    // First get the story to find its project
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });
    
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Check if a wall post exists for this project, create one if not
    let wallPost = await prisma.wall_post.findFirst({
      where: { project_id: story.project_id }
    });

    if (!wallPost) {
      wallPost = await prisma.wall_post.create({
        data: {
          title: `Comments for Project ${story.project_id}`,
          description: 'Project comments',
          created_at: new Date(),
          project_id: story.project_id || 0,
          person_id: userId
        }
      });
    }

    // Create the comment with preserved whitespace
    const comment = await prisma.post_comment.create({
      data: {
        description: content.toString(), // Ensure whitespace is preserved by converting to string
        created_at: new Date(),
        wall_post_id: wallPost.id,
        person_id: userId
      },
      include: {
        person: {
          select: {
            name: true,
            lastname: true
          }
        }
      }
    });

    // Format the response
    const formattedComment = {
      id: comment.id,
      content: comment.description?.toString() || '', // Ensure string conversion
      created_at: comment.created_at,
      author_id: comment.person_id,
      author_name: comment.person ? `${comment.person.name} ${comment.person.lastname}` : 'Unknown User',
      author: comment.person
    };

    return NextResponse.json(formattedComment);
  } catch (error) {
    console.error("Error creating comment:", error);
  } return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
