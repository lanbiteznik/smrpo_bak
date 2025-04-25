import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { validateEstimation, isEstimationRealistic } from '@/services/estimationService';

const prisma = new PrismaClient();

function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectIdString = searchParams.get("project_id");
  
    if (!projectIdString) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
  
    const project_id = parseInt(projectIdString, 10);
    if (isNaN(project_id)) {
      return NextResponse.json({ error: "Invalid project_id" }, { status: 400 });
    }
  
    try {
      // Get all stories for the project
      const stories = await prisma.story.findMany({
        where: { project_id },
        orderBy: { created_at: "asc" },
      });
  
      return NextResponse.json(stories, { status: 200 });
    } catch (error) {
      console.error("Error fetching stories:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, tests, priority, business_value, project_id } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!description || description.trim() === "") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    if (!tests || tests.trim() === "") {
      return NextResponse.json(
        { error: "There must be at least one acceptance test" },
        { status: 400 }
      );
    }


    // Check if the title already exists in this project
    const normalizedTitle = removeDiacritics(title).toLowerCase().trim();

    const allStories: { title: string | null }[] = await prisma.story.findMany({
      where: {
        project_id: Number(project_id),
      },
      select: {
        title: true,
      },
    });
    
    const existingStoryCnt = allStories.filter((s: { title: string | null }) =>
      s.title && removeDiacritics(s.title).toLowerCase().trim() === normalizedTitle
    );

    if (existingStoryCnt.length > 0) {
      return new Response(
        JSON.stringify({ error: 'A story with this title already exists in this project' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (business_value > 11 || business_value < 1) {
      return NextResponse.json(
        { error: "Business value must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Continue with story creation
    const story = await prisma.story.create({
      data: {
        title,
        description,
        tests,
        priority,
        business_value,
        project_id,
        // Other fields...
      }
    });

    return new Response(
      JSON.stringify(story),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating story:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create story' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(req: Request) {
  const data = await req.json();
  const { id, time_required, sprint_id } = data;
  
  // Get the existing story
  const existingStory = await prisma.story.findUnique({
    where: { id: Number(id) }
  });
  
  // Prevent modifications to stories in sprints
  if (existingStory?.sprint_id && existingStory.sprint_id !== sprint_id) {
    return Response.json(
      { error: "Cannot modify a story that is already assigned to a Sprint" },
      { status: 403 }
    );
  }
  
  // Validate estimation if provided
  if (time_required !== undefined) {
    const validation = validateEstimation(time_required);
    if (!validation.valid) {
      return Response.json({ error: validation.message }, { status: 400 });
    }
    
    // Check if estimation seems realistic
    const realisticCheck = isEstimationRealistic(time_required);
    if (!realisticCheck.realistic) {
      // We could either return an error or just a warning
      // For now, let's add a warning but allow the update
      data.estimation_warning = realisticCheck.message;
    }
  }
  
  // Proceed with update
  const updatedStory = await prisma.story.update({
    where: { id: Number(id) },
    data
  });
  
  return Response.json(updatedStory);
}
  