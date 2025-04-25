import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

    // Check if sprint exists first
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId }
    });
    
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const startDate = new Date(sprint.start_date ?? new Date());
    const endDate = new Date(sprint.finish_date ?? new Date());
    const today = new Date();

    // Get story points for this sprint
    const stories = await prisma.story.findMany({
      where: { sprint_id: sprintId },
      include: {
        subtasks: {
          include: {
            person: true
          }
        }
      }
    });
    
    const totalPoints = stories.reduce((sum: number, story: { time_required: number | null }) => 
      sum + (story.time_required || 0), 0);
    
    // Calculate total days in sprint
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Generate dates array for each day of the sprint
    const dates = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      dates.push(currentDate.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    }

    // Generate ideal burndown data
    const idealBurndown = dates.map((date, index) => {
      const idealRemaining = totalPoints - (totalPoints / totalDays * index);
      return {
        date,
        value: Math.max(0, Math.round(idealRemaining * 10) / 10)
      };
    });

    // Get actual burndown data
    // We'll use a simplified approach for now - this can be enhanced based on your actual data structure
    const actualBurndown: { date: string; value: number | null }[] = [];
    const remainingPoints = totalPoints;
    
    for (const date of dates) {
      const dateObj = new Date(date);
      // Don't include future dates in actual burndown
      if (dateObj > today) {
        actualBurndown.push({
          date,
          value: null // null for future dates
        });
        continue;
      }

      // For completed stories on or before this date, subtract their points
      /*
      for (const story of stories) {
        if (story.finished && story.finished_at) {
          const finishDate = new Date(story.finished_at);
          const finishDateStr = finishDate.toISOString().split('T')[0];
          
          if (finishDateStr === date && !story.counted_in_burndown) {
            remainingPoints -= (story.time_required || 0);
            story.counted_in_burndown = true;
          }
        }
      }
      */

      actualBurndown.push({
        date,
        value: Math.max(0, remainingPoints)
      });
    }

    // Combine into a single response array
    const burndownData = dates.map(date => {
      const ideal = idealBurndown.find(item => item.date === date) || { value: 0 };
      const actual = actualBurndown.find(item => item.date === date);
      
      return {
        date,
        ideal: ideal.value,
        actual: actual ? actual.value : null
      };
    });

    return NextResponse.json(burndownData);
  } catch (error) {
    console.error("Error generating burndown chart data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}