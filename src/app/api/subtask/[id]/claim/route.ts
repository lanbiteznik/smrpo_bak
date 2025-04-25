import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const subtaskId = parseInt(rawId, 10);
    const currentUserId = typeof session.user.id === 'string' ? parseInt(session.user.id, 10) : session.user.id;
    
    // Check if the subtask exists
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId }
    });

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    // Check if the subtask is unassigned
    if (subtask.assignee !== null) {
      return NextResponse.json({ 
        error: 'This task is already assigned to someone' 
      }, { status: 400 });
    }

    // Record the claim in task history (if task_history table exists)
    try {
      await prisma.task_history.create({
        data: {
          subtask_id: subtaskId,
          previous_assignee: null,
          new_assignee: currentUserId,
          action: 'claimed',
          performed_by: currentUserId,
          created_at: new Date()
        }
      });
    } catch (historyError) {
      // If task_history table doesn't exist, just log and continue
      console.warn('Could not create task history record:', historyError);
    }

    // Update the subtask to assign to the current user
    // Set rejected to false since the developer is accepting it directly
    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        assignee: currentUserId,
        rejected: false, // Directly accepted when claimed
        accepted: true // Mark as accepted
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
    console.error('Error claiming subtask:', error);
    return NextResponse.json({ error: 'Failed to claim subtask' }, { status: 500 });
  }
}