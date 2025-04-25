import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const storyId = parseInt(rawId, 10);
    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }
    
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        subtasks: true
      }
    });
    
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    
    return NextResponse.json(story);
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const storyId = parseInt(rawId, 10);
    const body = await req.json();
    const { title, description, tests, priority, business_value, time_required } = body;

    // First get the story to check its project_id
    const currentStory = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!currentStory) {
      return new Response(
        JSON.stringify({ error: 'Story not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if another story in the same project has this title
    const existingStory = await prisma.story.findFirst({
      where: {
        title: title,
        project_id: currentStory.project_id,
        id: { not: storyId } // Exclude the current story
      }
    });

    if (existingStory) {
      return new Response(
        JSON.stringify({ error: 'A story with this title already exists in this project' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Continue with story update
    const story = await prisma.story.update({
      where: { id: storyId },
      data: {
        title,
        description,
        tests,
        priority,
        business_value,
        time_required, // Add this line to include time_required in the update
      }
    });

    return new Response(
      JSON.stringify(story),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating story:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update story' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const storyId = parseInt(rawId, 10);
    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }
    
    // Get the story with its project to check permissions
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { 
        project: true,
        subtasks: true 
      }
    });
    
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    
    // Check if story is assigned to a sprint or is realized
    if (story.sprint_id) {
      return NextResponse.json({ error: "Cannot delete a story assigned to a sprint" }, { status: 403 });
    }
    
    if (story.finished) {
      return NextResponse.json({ error: "Cannot delete a realized story" }, { status: 403 });
    }
    
    // Check if user has permission (is Product Owner or Scrum Master for this project)
    const username = session.user.username;
    const projectUsers = story.project?.users || "";
    
    const isProductOwner = projectUsers.includes(`Product Owner: ${username}`);
    const isScrumMaster = projectUsers.includes(`Scrum Master: ${username}`);
    
    if (!isProductOwner && !isScrumMaster && session.user.role !== 2) {
      return NextResponse.json({ error: "Only Product Owners and Scrum Masters can delete stories" }, { status: 403 });
    }
    
    // Use a transaction to delete the story and its subtasks
    await prisma.$transaction(async (tx) => {
      // First delete all subtasks
      if (story.subtasks && story.subtasks.length > 0) {
        await tx.subtask.deleteMany({
          where: { story_id: storyId }
        });
      }
      
      // Then delete the story
      await tx.story.delete({
        where: { id: storyId }
      });
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}