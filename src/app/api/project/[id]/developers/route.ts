import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params;      // ctx.params is already Promise<{id:string}>
    const projectId = parseInt(rawId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }
    
    // Get the project to access the users string
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project || !project.users) {
      return NextResponse.json([]);
    }
    
    console.log("Project users string:", project.users);
    
    // Parse the users string to extract usernames
    const usersString = project.users;
    
    // Check if the format uses pipe separators
    let usernames: string[] = [];
    
    if (usersString.includes(" | ")) {
      // Format: "Product Owner: username | Scrum Master: username | Developers: username1, username2"
      const parts = usersString.split(" | ");
      
      // Find the developers part
      const developersPart = parts.find(part => part.startsWith("Developers:"));
      
      if (developersPart) {
        // Extract developer usernames
        const devNames = developersPart.replace("Developers:", "").split(",").map(name => name.trim());
        usernames = devNames;
      } else {
        // If no developers part found, extract all usernames
        usernames = parts.map(part => {
          const colonIndex = part.indexOf(":");
          return colonIndex > -1 ? part.substring(colonIndex + 1).trim() : part.trim();
        });
      }
    } else {
      // Older format: "Developer:username,Product Owner:username2"
      const userRoles = usersString.split(',').map(entry => entry.trim());
      
      usernames = userRoles.map(entry => {
        const parts = entry.split(':');
        return parts.length > 1 ? parts[1].trim() : entry.trim();
      }).filter(username => username !== '');
    }
    
    console.log("Extracted usernames:", usernames);
    
    // Fetch all developers by their usernames
    const developers = await prisma.person.findMany({
      where: {
        username: {
          in: usernames
        }
      },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        username: true
      }
    });
    
    console.log("Found developers:", developers.length);
    
    // If no developers found, fetch all users as fallback
    if (developers.length === 0) {
      const allUsers = await prisma.person.findMany({
        where: {
          active: true
        },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          username: true
        }
      });
      
      return NextResponse.json(allUsers);
    }
    
    return NextResponse.json(developers);
  } catch (error) {
    console.error("Error fetching developers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}