import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      select: { id: true, username: true, role: true },
    });

    return NextResponse.json(persons, { status: 200 });
  } catch (error) {
    console.error("Error fetching persons:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}