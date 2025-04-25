import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const sprintId = parseInt(rawId, 10);
    
    if (isNaN(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }
    
    const { stories, markComplete } = await request.json();
    
    // Check if sprint exists
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId }
    });
    
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }
    
    if(!markComplete) {
      // Begin a transaction to handle all updates
      await prisma.$transaction(async (tx) => {
        // Process each story to return to backlog
        for (const storyData of stories) {
          // Get the current story to preserve any fields we're not updating
          const story = await tx.story.findUnique({
            where: { id: storyData.id }
          });
          
          if (!story) continue;
          
          // Update the story with rejection information while moving it back to product backlog
          await tx.story.update({
            where: { id: storyData.id },
            data: {
              // Move back to product backlog
              sprint_id: null,
              active: false,
              finished: false,
              
              // Store rejection details using existing fields
              rejected: true,
              // Use the existing rejected_description field to store the comment
              rejected_description: storyData.comment, 
              // Store the time_required at rejection time to track what was rejected
              rejected_time_required: story.time_required,
            }
          });
          
          // Create a wall_post as a record of the story being returned
          // This uses existing tables without schema changes
          const postTitle = `Story "${story.title}" returned to Product Backlog`;
          const postContent = `Reason: ${storyData.rejectionReason}\n${storyData.comment}`;
          
          await tx.wall_post.create({
            data: {
              title: postTitle.substring(0, 64),  // Ensure it fits in the VARCHAR(64)
              description: postContent,
              created_at: new Date(),
              project_id: sprint.project_id,
              person_id: request.headers.get('x-user-id') ? 
                parseInt(request.headers.get('x-user-id') as string) : 
                null
            }
          });
        }  
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Sprint completed and selected stories returned to backlog" 
    });
  } catch (error) {
    console.error("Error completing sprint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}