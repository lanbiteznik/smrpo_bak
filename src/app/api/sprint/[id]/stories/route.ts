import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const sprintId = parseInt(rawId, 10);
    
    if (isNaN(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }

    // Fetch stories for the sprint with their subtasks
    const stories = await prisma.story.findMany({
      where: {
        sprint_id: sprintId
      },
      include: {
        subtasks: true,
        project: true
      }
    });

    return NextResponse.json(stories);
  } catch (error) {
    console.error("Error fetching sprint stories:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 