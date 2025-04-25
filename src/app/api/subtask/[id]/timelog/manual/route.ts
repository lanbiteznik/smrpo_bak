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

  const body = await req.json();
  const { date, duration } = body;

  if (!date || !duration || isNaN(duration)) {
    return NextResponse.json({ error: 'Invalid manual log input' }, { status: 400 });
  }

  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  try {
    const newLog = await prisma.task_time_log.create({
      data: {
        task_id: taskId,
        user_id: Number(session.user.id),
        date: parsedDate,
        start_time: null,
        end_time: null,
        duration,
        estimated_remaining: 0,
      },
    });

    return NextResponse.json(newLog);
  } catch (error) {
    console.error("Error creating manual log:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
