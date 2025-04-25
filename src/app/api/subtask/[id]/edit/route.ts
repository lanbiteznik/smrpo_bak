import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) 
{
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const subtaskId = parseInt(rawId, 10);

    // Check if the subtask exists
    const existingSubtask = await prisma.subtask.findUnique({
        where: { id: subtaskId }
    });
    if (!existingSubtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const data = await request.json();
    const { description, time_required, assignee, priority, rejected } = data;
    console.log("subtask data: ", description, time_required, assignee, priority, rejected)
    
    if (!description || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (time_required === undefined || isNaN(time_required)) {
      return NextResponse.json({ error: 'Time required is required' }, { status: 400 });
    }
    if (![1, 2, 3].includes(priority)) {
        return NextResponse.json({ error: "Valid priority must be selected" }, { status: 400 });
    }

    const hasChanges =
    existingSubtask.description !== description ||
    existingSubtask.time_required !== time_required ||
    existingSubtask.priority !== priority ||
    existingSubtask.assignee !== assignee;

    if (!hasChanges) {
        return NextResponse.json({ message: "No changes detected" }, { status: 200 });
    }

    if (time_required <= 0 || time_required > 8) {
        return NextResponse.json({ error: "Time required must be between 0.1 and 8 hours" }, { status: 400 });
    }

    // Update the subtask
    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(existingSubtask.description !== description && { description }),
        ...(existingSubtask.time_required !== time_required && { time_required }),
        ...(existingSubtask.priority !== priority && { priority }),
        ...(existingSubtask.assignee !== assignee && { assignee, rejected: null }),
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