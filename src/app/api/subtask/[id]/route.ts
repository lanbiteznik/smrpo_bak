import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const subtaskId = parseInt(rawId, 10);
    if (isNaN(subtaskId)) {
      return NextResponse.json({ error: "Invalid subtask ID" }, { status: 400 });
    }
    
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        person: {
          select: {
            name: true,
            lastname: true
          }
        }
      }
    });
    
    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }
    
    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Error fetching subtask:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const subtaskId = parseInt(rawId, 10);
    const data = await request.json();
    
    // Check if the subtask exists
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId }
    });

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    // Special case for just toggling finished status
    if (data.finished !== undefined && Object.keys(data).length === 1) {
      // Anyone can mark a task as finished/unfinished
      const updatedSubtask = await prisma.subtask.update({
        where: { id: subtaskId },
        data: {
          finished: data.finished
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
      
      return NextResponse.json(updatedSubtask);
    }

    // For assignment changes, check if the user is a Scrum Master
    if (data.assignee !== undefined && data.assignee !== subtask.assignee) {
      // Check if user is a Scrum Master
      if (session.user.role !== 1) {
        return NextResponse.json({ 
          error: 'Only Scrum Masters can assign or reassign tasks' 
        }, { status: 403 });
      }

      // If the task was rejected, we can reassign it
      if (subtask.rejected !== true && subtask.assignee !== null) {
        // Create a record of the reassignment
        await prisma.task_history.create({
          data: {
            subtask_id: subtaskId,
            previous_assignee: subtask.assignee, // This should be a number
            new_assignee: data.assignee ? Number(data.assignee) : null, // Ensure this is a number
            action: 'reassigned',
            performed_by: typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id,
            created_at: new Date()
          }
        });
      }

      // When a task is assigned/reassigned, it's initially in a "pending" state
      // The developer needs to accept it
      data.rejected = null; // null means "pending acceptance"
    }

    // For other updates, check if the user is allowed to edit this subtask
    const currentUserId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id, 10) 
      : session.user.id;
    const isScrumMaster = session.user.role === 1;
    
    if (!isScrumMaster && 
        subtask.assignee && 
        subtask.assignee !== currentUserId && 
        subtask.rejected === false) {
      return NextResponse.json({ 
        error: 'You cannot edit a task that has been accepted by another developer' 
      }, { status: 403 });
    }

    // Update the subtask
    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        description: data.description,
        time_required: data.time_required ? parseInt(data.time_required) : null,
        priority: data.priority ? parseInt(data.priority) : null,
        // Only allow assignee changes for Scrum Masters
        assignee: isScrumMaster ? (data.assignee ? parseInt(data.assignee) : null) : subtask.assignee,
        finished: data.finished !== undefined ? data.finished : subtask.finished,
        // Reset rejection status if the task is being reassigned
        rejected: data.assignee !== subtask.assignee ? null : subtask.rejected
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

    return NextResponse.json(updatedSubtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { description, time_required, assignee, priority, story_id } = data;

    // Create the subtask
    const subtask = await prisma.subtask.create({
      data: {
        description,
        time_required: time_required ? parseInt(time_required.toString()) : null,
        assignee: assignee ? parseInt(assignee.toString()) : null,
        priority: priority ? parseInt(priority.toString()) : null,
        story_id: parseInt(story_id.toString()),
        finished: false,
        rejected: assignee ? null : undefined, // null means pending acceptance
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
    console.error('Error creating subtask:', error);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}
