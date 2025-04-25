import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET endpoint to fetch subtasks for a story
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get("story_id");

  if (!storyId) {
    return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
  }

  try {
    const subtasks = await prisma.subtask.findMany({
      where: {
        story_id: parseInt(storyId)
      },
      include: {
        person: {
          select: {
            name: true,
            lastname: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error("Error fetching subtasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST endpoint to create a new subtask
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { description, time_required, assignee, priority, story_id } = data;

    console.log("Received subtask data:", data);

    if (!story_id) {
      return NextResponse.json({ 
        error: "Story_id is required" 
       }, { status: 400 });
     }
 
     if (!description) {
       return NextResponse.json({ 
         error: "Description is required"
      }, { status: 400 });
    }

    // Verify the story exists
    const story = await prisma.story.findUnique({
      where: { id: Number(story_id) }
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    
    if (!time_required) {
      return NextResponse.json({ 
        error: "Time required is required" 
      }, { status: 400 });
    }

    if (time_required !== undefined && (time_required > 50 || time_required < 1)) {
      return Response.json({ error: "Time required must be between 1 and 50" }, { status: 400 });
    }

    if (!time_required) {
      return NextResponse.json({ 
        error: "Time required is required" 
      }, { status: 400 });
    }

    if (time_required !== undefined && (time_required > 50 || time_required < 1)) {
      return Response.json({ error: "Time required must be between 1 and 50" }, { status: 400 });
    }

    // Create the subtask with proper typing
    interface SubtaskCreateData {
      description: string;
      story_id: number;
      finished: boolean;
      created_at: Date;
      time_required?: number;
      assignee?: number;
      priority?: number;
    }

    const subtaskData: SubtaskCreateData = {
      description,
      story_id: Number(story_id),
      finished: false,
      created_at: new Date()
    };

    // Add optional fields if they exist
    if (time_required !== undefined) {
      subtaskData.time_required = Number(time_required);
    }
    
    if (assignee !== undefined) {
      subtaskData.assignee = Number(assignee);
    }
    
    if (priority !== undefined) {
      subtaskData.priority = Number(priority);
    }

    console.log("Creating subtask with data:", subtaskData);

    const subtask = await prisma.subtask.create({
      data: subtaskData,
      include: {
        person: {
          select: {
            name: true,
            lastname: true
          }
        }
      }
    });

    console.log("Created subtask:", subtask);
    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Error creating subtask:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PUT endpoint to update a subtask
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, description, time_required, assignee, priority, finished } = data;

    if (!id) {
      return NextResponse.json({ error: "Subtask ID is required" }, { status: 400 });
    }

    // Update the subtask
    const subtask = await prisma.subtask.update({
      where: { id: Number(id) },
      data: {
        description,
        time_required: time_required !== undefined ? Number(time_required) : undefined,
        assignee: assignee !== undefined ? Number(assignee) : undefined,
        priority: priority !== undefined ? Number(priority) : undefined,
        finished: finished !== undefined ? finished : undefined
      },
      include: {
        person: {
          select: {
            name: true,
            lastname: true
          }
        }
      }
    });

    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Error updating subtask:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a subtask
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Subtask ID is required" }, { status: 400 });
    }
    
    await prisma.subtask.delete({
      where: { id: Number(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 