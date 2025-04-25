import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, sprint_id, active, finished, project_id } = data;
    
    if (!id) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }
    
    // Get the existing story
    const existingStory = await prisma.story.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingStory) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    
    // Verify the story belongs to the specified project
    if (existingStory.project_id !== project_id) {
      return NextResponse.json({ error: "Story does not belong to this project" }, { status: 403 });
    }

    if (sprint_id) {
      const targetSprint = await prisma.sprint.findUnique({
        where: { id: Number(sprint_id) }
      });

      if (!targetSprint) {
        return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
      }
    }

    // Update the story with the new status
    const updatedStory = await prisma.story.update({
      where: { id: Number(id) },
      data: {
        sprint_id: sprint_id === null ? null : Number(sprint_id),
        active,
        finished
      }
    });
    
    return NextResponse.json(updatedStory);
    
  } catch (error) {
    console.error("Error moving story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 