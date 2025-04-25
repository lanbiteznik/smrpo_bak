import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
        user_id: Number(session.user.id),
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error('Error fetching time logs:', err);
    return NextResponse.json({ error: 'Failed to load time logs' }, { status: 500 });
  }
}
