import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const projectId = parseInt(rawId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }
    
    // Fetch all stories for the project
    const stories = await prisma.story.findMany({
      where: { project_id: projectId },
      include: {
        subtasks: {
          include: {
            person: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    
    
    return NextResponse.json(stories);
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}  