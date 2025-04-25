import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const sprintId = parseInt(rawId, 10);
    if (isNaN(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }
    
    // Get the sprint to check the project
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { project_id: true }
    });
    
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }
    
    // Find (or create) a wall_post for this sprint's daily scrums
    const wallPost = await prisma.wall_post.findFirst({
      where: { 
        project_id: sprint.project_id,
        title: `Daily Scrum: Sprint ${sprintId}`
      }
    });
    
    if (!wallPost) {
      // Return empty array if no wall post exists yet
      return NextResponse.json([]);
    }
    
    // Fetch all comments for this wall post
    const comments = await prisma.post_comment.findMany({
      where: { wall_post_id: wallPost.id },
      orderBy: { created_at: 'desc' },
      include: {
        person: {
          select: {
            name: true,
            lastname: true
          }
        }
      }
    });
    
    // Transform comments into daily scrum format
    const scrumEntries = comments.map((comment) => {
      return {
        id: comment.id,
        description: comment.description,
        // Handle potential null value with a default Date object
        created_at: comment.created_at || new Date(),
        person_id: comment.person_id || 0,
        person: comment.person,
        // Add any other fields needed
      };
    });
    
    return NextResponse.json(scrumEntries);
  } catch (error) {
    console.error("Error fetching daily scrum entries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const sprintId = parseInt(rawId, 10);
    if (isNaN(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }
    
    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id, 10) : session.user.id as number;
    const body = await request.json();
    const { yesterday, today, blockers } = body;
    
    // Get the sprint to check the project
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { project_id: true }
    });
    
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }
    
    // Find or create a wall_post for this sprint's daily scrums
    let wallPost = await prisma.wall_post.findFirst({
      where: { 
        project_id: sprint.project_id,
        title: `Daily Scrum: Sprint ${sprintId}`
      }
    });
    
    if (!wallPost) {
      wallPost = await prisma.wall_post.create({
        data: {
          title: `Daily Scrum: Sprint ${sprintId}`,
          description: 'Daily scrum entries for this sprint',
          created_at: new Date(),
          project_id: sprint.project_id,
          person_id: userId
        }
      });
    }
    
    // Store scrum data as JSON in the comment description
    const scrumData = JSON.stringify({
      yesterday,
      today,
      blockers: blockers || ''
    });
    
    // Create a comment for this scrum entry
    const comment = await prisma.post_comment.create({
      data: {
        description: scrumData,
        created_at: new Date(),
        wall_post_id: wallPost.id,
        person_id: userId
      },
      include: {
        person: {
          select: {
            name: true,
            lastname: true
          }
        }
      }
    });
    
    // Format the response
    const formattedEntry = {
      id: comment.id,
      date: comment.created_at,
      yesterday,
      today,
      blockers: blockers || '',
      person_id: userId,
      person_name: comment.person ? `${comment.person.name} ${comment.person.lastname}` : 'Unknown User'
    };
    
    return NextResponse.json(formattedEntry);
  } catch (error) {
    console.error("Error creating daily scrum entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}