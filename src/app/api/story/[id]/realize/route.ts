import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }){
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const storyId = parseInt(rawId, 10);
    
    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    const { acceptanceTestPassed, comment, realized_at } = await request.json();

    if (!comment) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { subtasks: true }
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.finished) {
      return NextResponse.json({ error: "Story is already marked as realized" }, { status: 400 });
    }

    if (acceptanceTestPassed) {
      if (!story.sprint_id) {
        return NextResponse.json({ error: "Only stories assigned to a sprint can be realized" }, { status: 400 });
      }

      if (story.subtasks && story.subtasks.length > 0) {
        const unfinishedTasks = story.subtasks.filter((task: { finished: boolean | null }) => !task.finished);
        if (unfinishedTasks.length > 0) {
          return NextResponse.json({ 
            error: "All tasks must be completed before marking the story as realized" 
          }, { status: 400 });
        }
      }

      const updatedStory = await prisma.story.update({
        where: { id: storyId },
        data: {
          finished: true,
          active: false,
          rejected: false
        }
      });

      await prisma.wall_post.create({
        data: {
          person_id: typeof session.user.id === 'string' ? parseInt(session.user.id, 10) : session.user.id,
          description: `Acceptance tests passed. Comment: ${comment}`,
          created_at: new Date(realized_at),
          project_id: story.project_id || 0,
        }
      });

      return NextResponse.json({
        success: true,
        message: "Story has been marked as realized",
        story: updatedStory
      });

    } else {
      const updatedStory = await prisma.story.update({
        where: { id: storyId },
        data: {
          sprint_id: null,
          active: false,
          finished: false,
          rejected: true,
          rejected_description: comment,
          rejected_time_required: story.time_required
        }
      });

      await prisma.wall_post.create({
        data: {
          title: `Story "${story.title}" failed acceptance test`,
          description: `The story was returned to the backlog. Reason: ${comment}`,
          created_at: new Date(realized_at),
          project_id: story.project_id || 0,
          person_id: typeof session.user.id === 'string' ? parseInt(session.user.id, 10) : session.user.id
        }
      });

      return NextResponse.json({
        success: true,
        message: "Story has been returned to the backlog",
        story: updatedStory
      });
    }

  } catch (error) {
    console.error("Error realizing story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
