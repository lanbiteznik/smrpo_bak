import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const projectId = parseInt(rawId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }
    
    // Fetch all sprints for the project
    const sprints = await prisma.sprint.findMany({
      where: { 
        project_id: projectId 
      },
      orderBy: {
        start_date: 'desc'
      }
    });
    
    return NextResponse.json(sprints);
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 