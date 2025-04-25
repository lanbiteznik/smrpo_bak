// app/users/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row } from "react-bootstrap";
import DeleteUserButton from "./components/DeleteUserButton"; // import the delete button
import AddUserComponent from "./components/AddUserComponent";
import Link from "next/link";
import Button from "react-bootstrap/Button";
import { Person } from "../models/models";
import "next-auth";
import "next-auth/jwt";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  // Check for user session and redirect if unauthenticated
  if (!session) {
    redirect("/signin"); // adjust the sign in path as needed
  }

  const users: Person[] = await prisma.person.findMany({
    orderBy: {
      id: 'desc'
    }
  });

  return (
    <Container>
      <Row>
        <h1 className="mb-4 mt-4">Users</h1>
      </Row>
      <Row>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Last name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
              </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.lastname}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role == 2 ? "Admin" : "Developer"}</td>
                <td>
                  {(session?.user as Person)?.role === 2 && (
                    <>
                      <Link href={`/users/edit/${user.id}`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                      </Link>
                      <DeleteUserButton userId={user.id} />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Row>
      <Row>
        <AddUserComponent />
      </Row>
    </Container>
  );
}