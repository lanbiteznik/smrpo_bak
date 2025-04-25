// src/app/api/wall/[postId]/comment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) 
{
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const postIdNum = parseInt(rawId, 10);
  if (isNaN(postIdNum)) {
    return NextResponse.json(
      { error: 'Invalid wall post ID' },
      { status: 400 }
    );
  }

  try {
    const comments = await prisma.post_comment.findMany({
      where: { wall_post_id: postIdNum },
      orderBy: { created_at: 'asc' },
      include: {
        person: {
          select: { id: true, name: true, lastname: true, username: true },
        },
      },
    });
    return NextResponse.json(comments, { status: 200 });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const postIdNum = parseInt(rawId, 10);
  if (isNaN(postIdNum)) {
    return NextResponse.json(
      { error: 'Invalid wall post ID' },
      { status: 400 }
    );
  }

  const { content, person_id } = await req.json();
  if (!content || content.trim() === '') {
    return NextResponse.json(
      { error: 'Empty comment' },
      { status: 400 }
    );
  }

  try {
    const newComment = await prisma.post_comment.create({
      data: {
        description: content,
        wall_post_id: postIdNum,
        person_id: parseInt(person_id, 10),
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
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
