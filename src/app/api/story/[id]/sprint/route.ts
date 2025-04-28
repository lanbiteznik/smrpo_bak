import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;  // ctx.params is a Promise
    const storyId = parseInt(rawId, 10);

    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    // Find story to get sprint_id
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { sprint_id: true },
    });

    if (!story || !story.sprint_id) {
      return NextResponse.json({ error: "Story or Sprint not found" }, { status: 404 });
    }

    // Find sprint using sprint_id
    const sprint = await prisma.sprint.findUnique({
      where: { id: story.sprint_id },
      select: { start_date: true, finish_date: true },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    return NextResponse.json({
      start_date: sprint.start_date,
      end_date: sprint.finish_date,
    });
  } catch (error) {
    console.error("Error fetching sprint info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
