import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const subtaskId = parseInt(rawId, 10);
  if (isNaN(subtaskId)) {
    return NextResponse.json({ error: 'Invalid subtask ID' }, { status: 400 });
  }

  const body = await req.json();
  const timeRequired = Number(body.time_required);

  if (isNaN(timeRequired) || timeRequired < 0) {
    return NextResponse.json({ error: 'Invalid time value' }, { status: 400 });
  }

  try {
    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        time_required: timeRequired,
      },
    });

    return NextResponse.json(updatedSubtask);
  } catch (err) {
    console.error('Error updating time_required:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
