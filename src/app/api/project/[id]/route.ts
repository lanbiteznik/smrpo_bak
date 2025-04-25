import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) 
{
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const projectId = parseInt(rawId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    return NextResponse.json(project, { status: 200 });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const { title, description, selectedProductOwner, selectedScrumMaster, selectedDevelopers } = await request.json();

  const existingProject = await prisma.project.findUnique({ where: { id } });
  if (!existingProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch current data
  const exactTitleChanged = (existingProject.title || "") !== title;
  const newNormalized = removeDiacritics(title).toLowerCase().trim();
  const oldNormalized = removeDiacritics(existingProject.title || "").toLowerCase().trim();
  const normalizedTitleChanged = newNormalized !== oldNormalized;
  const descriptionChanged = (existingProject.description || "") !== (description || "");
  const titleChanged = exactTitleChanged || normalizedTitleChanged;

  // Validate required fields
  if (!title) {
    return NextResponse.json({ error: "Project Name is required" }, { status: 400 });
  }
  if (!selectedProductOwner || selectedScrumMaster.trim === "" || !selectedScrumMaster || !Array.isArray(selectedDevelopers) || selectedDevelopers.length === 0) {
    return NextResponse.json({ error: "All project roles (Product Owner, Scrum Master, and at least one Developer) are required" }, { status: 400 });
  }

  const users = [
    `Product Owner: ${selectedProductOwner}`,
    `Scrum Master: ${selectedScrumMaster}`,
    `Developers: ${selectedDevelopers.join(", ")}`,
  ].join(" | ");
  const usersChanged = existingProject.users !== users;
  if (!titleChanged && !descriptionChanged && !usersChanged) {
    return NextResponse.json({ message: "No changes detected" }, { status: 200 });
  }

  // Check for duplicate title
  const allProjects = await prisma.project.findMany({
    where: {
      id: { not: id },
    },
    select: { title: true },
  });

  const duplicatesCnt = allProjects.filter(
    (p: { title: string | null }) => p.title && removeDiacritics(p.title).toLowerCase().trim() === newNormalized
  );

  if (titleChanged && duplicatesCnt.length > 0) {
    return NextResponse.json(
      { error: "Project Name already exists" },
      { status: 400 }
    );
  }

  // Prevent removal of protected developers
  const currentUsersRaw = existingProject.users || "";
  const [, , devRaw] = currentUsersRaw.split("|").map((part: string) => part.trim());
  const currentDevs = devRaw?.replace("Developers: ", "").split(",").map((d: string) => d.trim()).filter(Boolean) || [];
  const removedDevs = currentDevs.filter((dev: string) => !selectedDevelopers.includes(dev));

  const persons = await prisma.person.findMany({
    where: {
      username: {
        in: [selectedProductOwner, ...selectedDevelopers, ...removedDevs],
      }
    },
    select: { id: true, username: true }
  });
  const personMap = Object.fromEntries(persons.map((p: { id: number, username: string }) => [p.username, p.id]));

  for (const devUsername of removedDevs) {
    const devId = personMap[devUsername];
    if (!devId) continue;

    const subtaskCount = await prisma.subtask.count({
      where: {
        assignee: devId,
        rejected: false,
        finished: false,
        story: {
          project_id: id,
        }
      }
    });

    if (subtaskCount > 0) {
      return NextResponse.json({
        error: `Cannot remove ${devUsername} from Developers. They have active subtasks.`,
      }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(titleChanged && { title }),
        ...(descriptionChanged && { description }),
        ...(usersChanged && { users }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}