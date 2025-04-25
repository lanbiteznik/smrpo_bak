import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();
const STORY_PREFIX = '__STORY_COMMENT__';
const getStoryPrefix = (storyId: number) => `${STORY_PREFIX}[${storyId}]::`;

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const storyId = parseInt(rawId, 10);
  const storyPrefix = getStoryPrefix(storyId);

  try {
    const storyComments = await prisma.post_comment.findMany({
      where: {
        description: {
          startsWith: storyPrefix,
        },
      },
      orderBy: { created_at: 'asc' },
      include: {
        person: {
          select: {
            name: true,
            lastname: true,
            username: true,
          }
        }
      }
    });
    
    const formatted = storyComments.map((comment) => {
      return {
        id: comment.id,
        content: comment.description || '',
        created_at: comment.created_at || new Date(), // Handle potential null value
        author_id: comment.person_id || 0,
        author_name: comment.person 
          ? `${comment.person.name} ${comment.person.lastname}` 
          : 'Unknown User',
        author: comment.person
      };
    });
    
    return NextResponse.json(formatted);
    
    
  } catch (error) {
    console.error('Error fetching story comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const storyId = parseInt(rawId, 10);
  const storyPrefix = getStoryPrefix(storyId);

  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { content, author_id } = body;

    if (!session?.user || session.user.role !== 1) {
      return NextResponse.json({ error: 'Only Scrum Masters can comment' }, { status: 403 });
    }

    if (!content || !author_id) {
      return NextResponse.json({ error: 'Missing comment or author' }, { status: 400 });
    }

    const fullContent = `${storyPrefix}${content}`;

    const comment = await prisma.post_comment.create({
      data: {
        description: fullContent,
        person_id: author_id,
        created_at: new Date()
      },
      include: {
        person: {
          select: {
            name: true,
            lastname: true,
            username: true,
          }
        }
      }
    });

    return NextResponse.json({
      id: comment.id,
      content,
      created_at: comment.created_at,
      author_id: comment.person_id,
      author_name: comment.person ? `${comment.person.name} ${comment.person.lastname}` : 'Unknown',
      author: comment.person
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}



// PUT endpoint to update a comment
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; commId: string }> }
) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 1) {
      return NextResponse.json({ error: 'Only Scrum Masters can edit comments' }, { status: 403 });
    }

    const { id, commId } = await ctx.params;
    const commentId = parseInt(commId);

    if (isNaN(commentId)) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
    }

    const { content } = await request.json();
    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    const storyPrefix = getStoryPrefix(parseInt(id));

    const updatedComment = await prisma.post_comment.update({
      where: { id: commentId },
      data: {
        description: `${storyPrefix}${content}`,
      },
      include: {
        person: {
          select: {
            name: true,
            lastname: true,
          }
        }
      }
    });

    // Format the response
    const formattedComment = {
      id: updatedComment.id,
      content: updatedComment.description,
      created_at: updatedComment.created_at,
      author_id: updatedComment.person_id,
      author_name: updatedComment.person ? `${updatedComment.person.name} ${updatedComment.person.lastname}` : 'Unknown User',
      author: updatedComment.person
    };

    return NextResponse.json(formattedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE endpoint to remove a comment
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; commId: string }> }
) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 1) {
      return NextResponse.json({ error: 'Only Scrum Masters can delete comments' }, { status: 403 });
    }

    const { commId } = await ctx.params;
    const commentId = parseInt(commId);
    if (isNaN(commentId)) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
    }

    // Delete the comment
    await prisma.post_comment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}