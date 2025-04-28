import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const activeLog = await prisma.task_time_log.findFirst({
        where: {
          user_id: userId,
          start_time: { not: null }, 
          end_time: null,           
        },
      });
      

    return NextResponse.json({ active: !!activeLog });
  } catch (error) {
    console.error("Error checking active time log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
