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
    
    // Check if the subtask exists
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId }
    });

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    // Check if the subtask is assigned to the current user
    const currentUserId = session.user.id as number;
    if (subtask.assignee !== currentUserId) {
      return NextResponse.json({ 
        error: 'You can only accept tasks assigned to you' 
      }, { status: 400 });
    }

    // Remove or comment out this block
    /*
    try {
      await prisma.task_history.create({
        data: {
          subtask_id: subtaskId,
          previous_assignee: subtask.assignee,
          new_assignee: currentUserId,
          action: 'accepted',
          performed_by: currentUserId,
          created_at: new Date()
        }
      });
    } catch (historyError) {
      // If task_history table doesn't exist, just log and continue
      console.warn('Could not create task history record:', historyError);
    }
    */

    // Update the subtask to mark as accepted
    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        rejected: false,
        accepted: true, 
        assignee: currentUserId
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
    console.error('Error accepting subtask:', error);
    return NextResponse.json({ error: 'Failed to accept subtask' }, { status: 500 });
  }
}