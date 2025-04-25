import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const WALL_PREFIX = "__WALL__:";

// GET: Fetch wall posts for a project
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const projectId = parseInt(rawId, 10);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    const rawPosts = await prisma.wall_post.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: "desc" },
        include: {
          person: {
            select: {
              id: true,
              name: true,
              lastname: true,
              username: true,
            },
          },
          comments: {
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
          },
        },
      });
      
      // Filter and strip the prefix
      const wallPosts = rawPosts
        .filter((post: { description?: string | null }) => post.description?.startsWith(WALL_PREFIX))
        .map((post: { description?: string | null }) => ({
          ...post,
          description: post.description?.replace(WALL_PREFIX, ''),
        }));
      
      return NextResponse.json(wallPosts);
      
  } catch (err) {
    console.error("Failed to fetch wall posts:", err);
    return NextResponse.json({ error: "Failed to load wall posts" }, { status: 500 });
  }
}

// POST: Create a new wall post
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const projectId = parseInt(rawId, 10);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { title, description, person_id } = body;

    if (!title || !description || !person_id) {
    return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
    );
    }

    const descriptionWithPrefix = `${WALL_PREFIX}${description}`;

    const newPost = await prisma.wall_post.create({
    data: {
        title,
        description: descriptionWithPrefix,
        person_id: parseInt(person_id),
        project_id: projectId,
        created_at: new Date(),
    },
    });


    return NextResponse.json(newPost);
  } catch (err) {
    console.error("Failed to create wall post:", err);
    return NextResponse.json({ error: "Failed to create wall post" }, { status: 500 });
  }
}

export async function DELETE(
    req: NextRequest
  ) {
    const postIdParam = req.nextUrl.searchParams.get("post_id");
  
    const postId = postIdParam ? parseInt(postIdParam) : NaN;
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }
  
    try {
      // Use a transaction to ensure all related comments are deleted
      await prisma.$transaction(async (tx) => {
        // First delete all comments related to this post
        await tx.post_comment.deleteMany({
          where: { wall_post_id: postId }
        });
        
        // Then delete the post itself
        await tx.wall_post.delete({
          where: { id: postId }
        });
      });
  
      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Failed to delete post:", err);
      return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
  }

