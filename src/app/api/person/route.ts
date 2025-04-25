import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';
import { Person } from '@/app/models/models';

export async function POST(request: Request) {
	// Parse JSON payload
	const { username, name, email, password, lastname, role } = await request.json();
	
	// Validate required fields
	if (!name || !email) {
		return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
	}

	const parsedRole = parseInt(role, 10);
	if (isNaN(parsedRole)) {
		return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
	}

	const normalizeUsername = (username: string) =>
		username
			.toLowerCase()
			.replace(/č/g, 'c')
			.replace(/š/g, 's')
			.replace(/ž/g, 'z');

	const canonicalUsername = normalizeUsername(username);
	const canonicalEmail = email.toLowerCase();
	const existingUser = await prisma.person.findFirst({
		where: {
			OR: [{ username: canonicalUsername }, { email: canonicalEmail }]
		}
	});
	if (existingUser) {
		return NextResponse.json({ error: 'Username or Email already exists' }, { status: 400 });
	}

	try {
		// Encrypt password before saving
		const hashedPassword = password ? await bcrypt.hash(password, 10) : '';
		const newUser = await prisma.person.create({
			data: { username, email, password: hashedPassword, name, lastname, role: parsedRole },
		});
		return NextResponse.json(newUser, { status: 201 });
	} catch (error) {
		console.error('Error creating user:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  console.log('Deleting user with id:', id);
  if (!id) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }
  try {
    const deletedUser = await prisma.$transaction(async (tx) => {
      // Attempt to delete the user
      return await tx.person.delete({
        where: { id: Number(id) },
      });
    });
    return NextResponse.json(deletedUser, { status: 200 });
  } catch (error: unknown) {

    console.error('Error deleting user:', error);
  
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete user due to foreign key constraints. Delete user from projects / tasks.' },
        { status: 400 }
      );
    }
  
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
  
}

export async function PATCH(request: Request) {
  const { id, password, username, email, role } = await request.json();
  
  if (!id) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const updateData: { username?: string, email?:string, password?: string; role?: number } = {};
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }
  if (role !== undefined) {
    updateData.role = role;
  }
  if (username) {
    const canonicalUsername = username.toLowerCase();
    const existingUser = await prisma.person.findFirst({
      where: { username: canonicalUsername }
    });
    if (existingUser && (existingUser as Person).id !== Number(id)) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }
    updateData.username = username;
  }

  if (email) {
    const canonicalEmail = email.toLowerCase();
    const existingUser = await prisma.person.findFirst({
      where: { email: canonicalEmail }
    });
    if (existingUser && (existingUser).id !== Number(id)) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    updateData.email = email;
  }
  
  try {
    const updatedUser = await prisma.person.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
