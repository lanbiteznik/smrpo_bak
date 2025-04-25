import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) 
{
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const subtaskId = parseInt(rawId, 10);
  if (isNaN(subtaskId)) {
    return NextResponse.json({ error: 'Invalid subtask ID' }, { status: 400 });
  }

  try {
    const logs = await prisma.task_time_log.findMany({
        where: {
          task_id: subtaskId,
          //user_id: Number(session.user.id),
        },
        orderBy: { date: "desc" },
        include: {
          person: {
            select: {
              id: true,
              username: true,
              name: true,
              lastname: true,
            }
          }
        }
      });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching time logs:', error);
    return NextResponse.json({ error: 'Failed to fetch time logs' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; lId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  
    const { id, lId } = await ctx.params;
    const logId = parseInt(lId);
    const subtaskId = parseInt(id);
  
    if (isNaN(logId) || isNaN(subtaskId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
  
    const body = await req.json();
    const { duration, estimated_remaining } = body;
  
    if (duration == null && estimated_remaining == null) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }
  
    try {
      const existing = await prisma.task_time_log.findUnique({
        where: { id: logId },
      });
  
      if (!existing || existing.user_id !== Number(session.user.id)) {
        return NextResponse.json({ error: "Not found or unauthorized" }, { status: 403 });
      }
  
      const updated = await prisma.task_time_log.update({
        where: { id: logId },
        data: {
          duration: duration ?? existing.duration,
          estimated_remaining: estimated_remaining ?? existing.estimated_remaining,
        },
      });
  
      return NextResponse.json(updated);
    } catch (err) {
      console.error("Error updating log:", err);
      return NextResponse.json({ error: "Failed to update log" }, { status: 500 });
    }
  }
