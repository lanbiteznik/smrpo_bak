import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export async function POST(request: Request) {
  // Parse JSON payload
  const { title, description, selectedProductOwner, selectedScrumMaster, selectedDevelopers } = await request.json();

  // Validate required fields
  if (!title) {
    return NextResponse.json({ error: "Project Name is required" }, { status: 400 });
  }

  if (!selectedProductOwner || !selectedScrumMaster || selectedDevelopers.length === 0) {
    return NextResponse.json({ error: "All project roles (Product Owner, Scrum Master, and at least one Developer) are required" }, { status: 400 });
  }

  const users = [
    `Product Owner: ${selectedProductOwner}`,
    `Scrum Master: ${selectedScrumMaster}`,
    `Developers: ${selectedDevelopers.join(", ")}`,
  ]
    .filter(Boolean)
    .join(" | ");

  if (!users || users.trim() === "") {
    return NextResponse.json({ error: "Users (roles) are required" }, { status: 400 });
  }

  // Check for duplicate title
  const normalizedTitle = removeDiacritics(title).toLowerCase().trim();

  const allProjects = await prisma.project.findMany({
    select: { title: true }
  });
  
  const duplicatesCnt = allProjects.filter((p: { title: string | null }) =>
    p.title && removeDiacritics(p.title).toLowerCase().trim() === normalizedTitle
  );

  if ( duplicatesCnt.length > 0) {
    return NextResponse.json(
      { error: "Project Name already exists" },
      { status: 400 }
    );
  }

  try {
    const localTime = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Ljubljana" })
    );

    const newProject = await prisma.project.create({
      data: {
        title,
        description,
        users,
        created_at: localTime,
        active: true,
      },
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}