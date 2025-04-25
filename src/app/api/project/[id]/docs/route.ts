import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const projectId = parseInt(rawId, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { docs: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ text: project.docs || "" }, { status: 200 });
  } catch (error) {
    console.error("Error loading docs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const projectId = parseInt(rawId, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Cannot save empty documentation" }, { status: 400 });
    }

    console.log("Received docs:", text);

    // Fetch existing docs to compare
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { docs: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (existing.docs?.trim() === text.trim()) {
      return NextResponse.json({ message: "No changes detected" }, { status: 200 });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { docs: text },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    console.error("Error saving docs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}