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

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const existingLog = await prisma.task_time_log.findFirst({
      where: {
        user_id: Number(session.user.id),
        task_id: taskId,
        date: today,
      },
      orderBy: { id: 'desc' }
    });

    if (existingLog && !existingLog.end_time) {
      return NextResponse.json({ error: 'Already tracking this task today' }, { status: 400 });
    }

    if (existingLog && existingLog.end_time) {
      const restarted = await prisma.task_time_log.update({
        where: { id: existingLog.id },
        data: {
          start_time: now,
          end_time: null
        }
      });
      return NextResponse.json(restarted);
    }

    const newLog = await prisma.task_time_log.create({
      data: {
        task_id: taskId,
        user_id: Number(session.user.id),
        date: today,
        start_time: now,
        duration: 0,
      }
    });

    return NextResponse.json(newLog);

  } catch (error) {
    console.error("Error starting time log:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
