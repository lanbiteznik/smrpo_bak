import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; lId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, lId } = await ctx.params;
  const subtaskId = parseInt(id);
  const logId = parseInt(lId);

  if (isNaN(subtaskId) || isNaN(logId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const body = await req.json();
  const { duration, estimated_remaining } = body;

  try {
    const updated = await prisma.task_time_log.update({
      where: {
        id: logId,
        task_id: subtaskId,
        user_id: Number(session.user.id)
      },
      data: {
        duration: typeof duration === 'number' ? duration : undefined,
        estimated_remaining: typeof estimated_remaining === 'number' ? estimated_remaining : undefined
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update error:', err);
    return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; logId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  
    const { id, logId } = await ctx.params;
    const logIdNum = parseInt(logId);
    const subtaskId = parseInt(id);
    const userId = Number(session.user.id);
  
    const { duration, estimated_remaining } = await req.json();
  
    if (isNaN(logIdNum) || isNaN(subtaskId)) {
      return NextResponse.json({ error: "Invalid log or task ID" }, { status: 400 });
    }
  
    try {
      const existingLog = await prisma.task_time_log.findUnique({
        where: { id: logIdNum },
      });
  
      if (!existingLog) {
        return NextResponse.json({ error: "Time log not found" }, { status: 404 });
      }
  
      if (existingLog.user_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
  
      const updated = await prisma.task_time_log.update({
        where: { id: logIdNum },
        data: {
          duration: duration ?? existingLog.duration,
          estimated_remaining: estimated_remaining ?? existingLog.estimated_remaining,
        },
      });
  
      return NextResponse.json(updated);
    } catch (error) {
      console.error("Error updating time log:", error);
      return NextResponse.json({ error: "Failed to update time log" }, { status: 500 });
    }
}
  

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; logId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, logId } = await ctx.params;
  console.log("ID:", id, "Log ID:", logId);
  const logIdNum = parseInt(logId);
  const userId = Number(session.user.id);

  console.log("Deleting log with ID:", logIdNum, typeof(logIdNum));

  if (isNaN(logIdNum)) {
    return NextResponse.json({ error: "Invalid log ID" }, { status: 400 });
  }

  try {
    const log = await prisma.task_time_log.findUnique({
      where: { id: logIdNum },
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    // Only allow user to delete their own logs
    if (log.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.task_time_log.delete({
      where: { id: logIdNum },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting log:", error);
    return NextResponse.json({ error: "Failed to delete time log" }, { status: 500 });
  }
}

