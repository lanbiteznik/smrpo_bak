import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { PrismaClient } from "@prisma/client";
import { validateEstimation, isEstimationRealistic } from '@/services/estimationService';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify user is a Methodology Administrator
    // Using username instead of email for the query
    const user = await prisma.person.findFirst({
      where: { 
        username: session.user.name as string,
        // Assuming role 2 is Methodology Administrator based on your schema
        role: 2
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: "Forbidden: Only Methodology Administrators can update time estimations" }, { status: 403 });
    }
    
    const data = await request.json();
    const { storyId, timeEstimation } = data;
    
    if (!storyId || timeEstimation === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Validate time estimation using our service
    const validation = validateEstimation(timeEstimation);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }
    
    // Check if story exists and is not assigned to a sprint
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });
    
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    
    if (story.sprint_id) {
      return NextResponse.json({ 
        error: "Cannot modify time estimation for stories already assigned to a Sprint" 
      }, { status: 400 });
    }
    
    // Check if estimation is realistic
    //const storyDescription = story.description || '';
    const realisticCheck = isEstimationRealistic(timeEstimation);
    
    // Update the story with the new time estimation
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: { 
        time_required: timeEstimation,
      }
    });
    
    // If there's a warning about the estimation, include it in the response
    if (!realisticCheck.realistic) {
      return NextResponse.json({
        ...updatedStory,
        warning: realisticCheck.message
      });
    }
    
    return NextResponse.json(updatedStory);
    
  } catch (error) {
    console.error("Error updating story time estimation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 