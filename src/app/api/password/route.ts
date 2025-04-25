import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { oldPassword, newPassword, userId } = await request.json();
    
    if (!oldPassword || !newPassword || !userId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    
    if (newPassword.length < 12 || newPassword.length > 128) {
      return NextResponse.json({ error: "Password must be between 12 and 128 characters." }, { status: 400 });
    }

    const user = await prisma.person.findUnique({ where: { id: Number(userId) } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.person.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    
    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
