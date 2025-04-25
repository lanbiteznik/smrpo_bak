import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const sprintId = parseInt(rawId, 10);
    if (isNaN(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }
    
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: {
        id: true,
        title: true,
        start_date: true,
        finish_date: true,
        active: true,
        velocity: true,
      },
    });
    
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }
    
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sprintStart = sprint.start_date ? new Date(sprint.start_date) : new Date(0);
  const sprintEnd = sprint.finish_date ? new Date(sprint.finish_date) : new Date(0);
  sprintStart.setHours(0, 0, 0, 0);
  sprintEnd.setHours(0, 0, 0, 0);

  let isActive: boolean | null = today >= sprintStart && today <= sprintEnd;
  if (sprintStart < today && sprintEnd < today) {
    isActive = null;
  }

  if (sprint.active !== isActive) {
    await prisma.sprint.update({
      where: { id: sprintId },
      data: { active: isActive }
    });
    sprint.active = isActive;
  }

  return NextResponse.json(sprint);
  } catch (error) {
    console.error("Error fetching sprint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the sprint to check its project
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const sprintId = parseInt(rawId, 10);
    if (isNaN(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { project: true }
    });
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Check if sprint exists and get any associated stories
    const sprintWithStories = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { 
        stories: true // Include the stories to update them
      }
    });
    
    if (!sprintWithStories) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Don't allow deletion of active sprints
    if (sprintWithStories.active) {
      return NextResponse.json({ error: "Cannot delete an active sprint" }, { status: 400 });
    }

    // Use a transaction to ensure all operations complete or fail together
    await prisma.$transaction(async (tx) => {

      // First, update any stories in the sprint to remove the sprint_id reference
      if (sprintWithStories.stories.length > 0) {
        await tx.story.updateMany({
          where: { sprint_id: sprintId },
          data: { 
            sprint_id: null,
            active: false // Reset the active status since these stories are back in backlog
          }
        });
      }
      
      // Then delete the sprint
      await tx.sprint.delete({
        where: { id: sprintId }
      });

      // Re-fetch all remaining sprints in the project
      const updatedSprints = await tx.sprint.findMany({
        where: { project_id: sprint.project_id },
        orderBy: { start_date: 'asc' }
      });

      // Reassign titles
      await Promise.all(
        updatedSprints.map((sprint: { id: number }, index: number) =>
          tx.sprint.update({
            where: { id: sprint.id },
            data: { title: `Sprint ${index + 1}` }
          })
        )
      );
    });

    return NextResponse.json({ success: true, message: "Sprint deleted and titles updated" });
  } catch (error) {
    console.error("Error deleting sprint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
  }

  const { start_date, finish_date, velocity, project_id, minPoints  } = await request.json();

  const existingSprint = await prisma.sprint.findUnique({ where: { id } });
    if (!existingSprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

  // Validate required fields
  if (!start_date || !finish_date) {
    return NextResponse.json({ error: "Start and finish dates are required" }, { status: 400 });
  }

  if (!velocity) {
    return NextResponse.json({ error: "Velocity is required" }, { status: 400 });
  }
  if (!project_id) {
    return NextResponse.json({ error: "Project ID not found" }, { status: 400 });
  }
  if (velocity && (Number(velocity) > 100 || Number(velocity) < 1)) {
    return NextResponse.json({ error: "Velocity must be between 1 and 100" }, { status: 400 });
  }
  if (velocity && (Number(velocity) < minPoints)) {
    return NextResponse.json({ error: "Velocity is too low given the total story points in this sprint" }, { status: 400 });
  }

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: Number(project_id) }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Convert string dates to Date objects if they're not already
  const newSprintStartDate = new Date(start_date);
  const newSprintFinishDate = new Date(finish_date);
  const oldSprintStartDate = existingSprint.start_date || new Date(0);
  const oldSprintFinishDate = existingSprint.finish_date || new Date(0);;

  const startDateChanged = newSprintStartDate.getTime() !== oldSprintStartDate.getTime();
  const finishDateChanged = newSprintFinishDate.getTime() !== oldSprintFinishDate.getTime();
  const velocityChanged = velocity !== existingSprint.velocity;

  if (!startDateChanged && !finishDateChanged && !velocityChanged) {
    return NextResponse.json({ message: "No changes detected" }, { status: 200 });
  }

  // Validate date range
  if ((startDateChanged || finishDateChanged) && (newSprintFinishDate <= newSprintStartDate)) {
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
  if ((startDateChanged || finishDateChanged) && (isWeekend(newSprintStartDate) || isHoliday(newSprintStartDate) || isWeekend(newSprintFinishDate) || isHoliday(newSprintFinishDate))) {
    return NextResponse.json(
      { error: "Sprint must not start or end on a weekend or holiday" },
      { status: 400 }
    );
  }
  
  // Validate start date
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if ((startDateChanged || finishDateChanged) && (newSprintStartDate <= yesterday)) {
    return NextResponse.json({ error: "Start date must not be in the past" }, { status: 400 });
  }

  // Check for overlapping sprints in the same project
  if (startDateChanged || finishDateChanged) {
    const overlappingSprints = await prisma.sprint.findMany({
      where: {
        project_id: Number(project_id),
        id: {
          not: id,
        },
        NOT: {
          OR: [
            { finish_date: { lt: newSprintStartDate } },
            { start_date: { gt: newSprintFinishDate } }
          ]
        }
      }
    });

    if (overlappingSprints.length > 0) {
      return NextResponse.json({ 
        error: "Sprint dates overlap with an existing sprint in this project" 
      }, { status: 400 });
    }
  }

  // Generate sprint title
  const existingSprints = await prisma.sprint.findMany({
    where: { project_id: Number(project_id) },
    orderBy: { start_date: 'asc' }
  });
  
  let insertionIndex = existingSprints.findIndex((sprint: { start_date: Date | null }) => 
    sprint.start_date && sprint.start_date > newSprintStartDate
  );
  if (insertionIndex === -1) insertionIndex = existingSprints.length;
  const title = `Sprint ${insertionIndex + 1}`;

  today.setHours(0, 0, 0, 0);
  const start = newSprintStartDate;
  start.setHours(0, 0, 0, 0);
  const end = newSprintFinishDate;
  end.setHours(0, 0, 0, 0);

  const isActive = today >= start && today <= end;

  // Create the sprint in a transaction
  const newSprint = await prisma.$transaction(async (tx) =>  {
    // Create sprint
    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        ...(startDateChanged && { start_date: newSprintStartDate }),
        ...(finishDateChanged && { finish_date: newSprintFinishDate }),
        ...(velocity && { velocity: Number(velocity) }),
        ...((startDateChanged || finishDateChanged) && { active: isActive ,title: title}),
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
    
    return sprint;
  });

  return NextResponse.json(newSprint, { status: 201 });
}
