import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const stories = await prisma.story.findMany({
      include: {
        subtasks: {
          include: {
            person: { select: { name: true, lastname: true } },
          },
        },
      },
    });

    return NextResponse.json(stories, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stories" + error }, { status: 500 });
  }
}
