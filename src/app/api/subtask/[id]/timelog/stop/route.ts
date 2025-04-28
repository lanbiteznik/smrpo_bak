import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) 
{
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const taskId = parseInt(rawId, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  const today = new Date(); 

  try {
    const body = await req.json();

    const activeLog = await prisma.task_time_log.findFirst({
      where: {
        user_id: Number(session.user.id),
        task_id: taskId,
        date: today,
        end_time: null
      },
      orderBy: { id: 'desc' }
    });

    if (!activeLog) {
      return NextResponse.json({ error: 'No active tracking session found.' }, { status: 400 });
    }

    const now = new Date();
    const start = new Date(activeLog.start_time!);

    const diffMs = now.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const updated = await prisma.task_time_log.update({
      where: { id: activeLog.id },
      data: {
        end_time: now,
        duration: activeLog.duration + diffHours, 
        estimated_remaining: body.estimated_remaining
      }
    });

    return NextResponse.json(updated);

  } catch (error) {
    console.error("Error stopping time log:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
