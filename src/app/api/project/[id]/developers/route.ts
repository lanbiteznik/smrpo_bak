import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const projectId = parseInt(id, 10);
    
    // Use the projects field as a string that contains project IDs
    const developers = await prisma.person.findMany({
      where: {
        projects: {
          contains: String(projectId)
        }
      },
      select: {
        id: true,
        name: true,
        lastname: true,
        username: true
      }
    });
    
    return NextResponse.json(developers);
  } catch (error) {
    console.error("Error fetching developers:", error);
    return NextResponse.json({ error: "Failed to fetch developers" }, { status: 500 });
  }
}