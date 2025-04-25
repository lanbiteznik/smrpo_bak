// src/app/api/sprint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { start_date, finish_date, velocity, project_id, stories } = await request.json();

    // Validate required fields
    if (!start_date || !finish_date) {
      return NextResponse.json({ error: "Start and finish dates are required" }, { status: 400 });
    }

    if (!project_id) {
      return NextResponse.json({ error: "Project ID not found" }, { status: 400 });
    }

    if (!velocity) {
      return NextResponse.json({ error: "Velocity is required" }, { status: 400 });
    }

    if (velocity && (Number(velocity) > 100 || Number(velocity) < 1)) {
      return NextResponse.json({ error: "Velocity must be between 1 and 100" }, { status: 400 });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: Number(project_id) }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Convert string dates to Date objects if they're not already
    const sprintStartDate = new Date(start_date);
    const sprintFinishDate = new Date(finish_date);

    // Validate date range
    if (sprintFinishDate <= sprintStartDate) {
      return NextResponse.json({ error: "Finish date must be after start date" }, { status: 400 });
    }

    const isWeekend = (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6;
    };

    const isHoliday = (date: Date) => {
      const slovenianHolidays = [
        '01-01', '02-01', '08-02', '27-04', '01-05', '02-05',
        '25-06', '15-08', '31-10', '01-11', '25-12', '26-12'
      ];

      const mmdd = new Intl.DateTimeFormat('en-GB', {
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Europe/Ljubljana'
      }).format(date).replace('/', '-');
      return slovenianHolidays.includes(mmdd);
    };

    // Validate holidays and weekends
    if (isWeekend(sprintStartDate) || isHoliday(sprintStartDate) || isWeekend(sprintFinishDate) || isHoliday(sprintFinishDate)) {
      return NextResponse.json(
        { error: "Sprint must not start or end on a weekend or holiday" },
        { status: 400 }
      );
    }
    
    // Validate start date
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (sprintStartDate <= yesterday) {
      return NextResponse.json({ error: "Start date must not be in the past" }, { status: 400 });
    }

    // Check for overlapping sprints in the same project
    const overlappingSprints = await prisma.sprint.findMany({
      where: {
        project_id: Number(project_id),
        NOT: {
          OR: [
            { finish_date: { lt: sprintStartDate } },
            { start_date: { gt: sprintFinishDate } }
          ]
        }
      }
    });

    if (overlappingSprints.length > 0) {
      return NextResponse.json({ 
        error: "Sprint dates overlap with an existing sprint in this project" 
      }, { status: 400 });
    }

    // Verify all stories exist and have story points
    const storyIds = Array.isArray(stories)
    ? stories.map((id: number) => Number(id))
    : [];
    const existingStories = await prisma.story.findMany({
      where: {
        id: { in: storyIds }
      }
    });

    // Check if all stories have story points
    if (storyIds.length > 0) {
      const storiesWithoutPoints = existingStories.filter((story: { time_required: number | null }) => !story.time_required);
      if (storiesWithoutPoints.length > 0) {
        return NextResponse.json({ 
          error: `The following stories are missing story points: ${storiesWithoutPoints.map((s: { title: string | null }) => s.title).join(", ")}`,
          storiesWithoutPoints: storiesWithoutPoints.map((s: { id: number }) => s.id)
        }, { status: 400 });
      }
    }

    // Generate sprint title
    const existingSprints = await prisma.sprint.findMany({
      where: { project_id: Number(project_id) },
      orderBy: { start_date: 'asc' }
    });
    
    let insertionIndex = existingSprints.findIndex((sprint: { start_date: Date | null }) => 
      sprint.start_date && sprint.start_date > sprintStartDate
    );
    if (insertionIndex === -1) insertionIndex = existingSprints.length;
    const title = `Sprint ${insertionIndex + 1}`;

    // Calculate total velocity based on selected stories
    const totalStoryPoints = existingStories.reduce((sum: number, story: { time_required: number | null }) => 
      sum + (story.time_required || 0), 0);

    if (velocity < totalStoryPoints) {
      return NextResponse.json({ error: "Velocity is too low given the total story points in this sprint" }, { status: 400 });
    }

    const isActive = today >= sprintStartDate && today <= sprintFinishDate;

    // Create the sprint in a transaction
    const newSprint = await prisma.$transaction(async (tx) =>  {
      // Create sprint
      const sprint = await tx.sprint.create({
        data: {
          title,
          start_date: sprintStartDate,
          finish_date: sprintFinishDate,
          velocity: Number(velocity),
          project_id: Number(project_id),
          active: isActive // Set active status based on current date
        }
      });

      // Update sprint titles
      const updatedSprints = await tx.sprint.findMany({
        where: { project_id: Number(project_id) },
        orderBy: { start_date: 'asc' }
      });
      
      await Promise.all(
        updatedSprints.map((sprint: { id: number }, index: number) =>
          tx.sprint.update({
            where: { id: sprint.id },
            data: { title: `Sprint ${index + 1}` }
          })
        )
      );      

      // Update stories to associate them with this sprint
      if (storyIds.length > 0) {
        await tx.story.updateMany({
          where: {
            id: { in: storyIds }
          },
          data: {
            sprint_id: sprint.id
          }
        });
      }

      return sprint;
    });

    return NextResponse.json(newSprint, { status: 201 });
  } catch (error) {
    console.error("Error creating sprint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}