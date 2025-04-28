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

  const { id: rawId } = await ctx.params;
  const taskId = parseInt(rawId, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  const body = await req.json();
  const { date, duration, estimated_remaining } = body;

  if (!date || !duration || isNaN(duration) || estimated_remaining === undefined || isNaN(estimated_remaining)) {
    return NextResponse.json({ error: 'Invalid manual log input' }, { status: 400 });
  }

  try {
    const { date, duration, estimated_remaining } = body;

    const dateLog = new Date(date); 

    const newLog = await prisma.task_time_log.create({
      data: {
        task_id: taskId,
        user_id: Number(session.user.id),
        date: dateLog,
        start_time: null,
        end_time: null,
        duration,
        estimated_remaining,
      },
    });

    return NextResponse.json(newLog);
  } catch (error) {
    console.error("Error creating manual log:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
