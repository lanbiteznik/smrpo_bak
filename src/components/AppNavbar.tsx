"use client";
import React from "react";
import { useSession, signOut } from "next-auth/react";
import { Navbar, Nav, Container, NavDropdown, Row, Button } from "react-bootstrap";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Person } from "@/app/models/models";

export default function AppNavbar() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Hide navbar if the user is not logged in
  if (!session?.user) return null;

  const handleOpenManual = () => {
    window.open('/uporabniskiprirocnik.pdf', '_blank');
  };

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Link href="/" passHref legacyBehavior>
          <Navbar.Brand>Scrum Board</Navbar.Brand>
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Link href="/" passHref legacyBehavior>
              <Nav.Link>Board</Nav.Link>
            </Link>
            {(session.user as Person).role === 2 &&
              <Link href="/users" passHref legacyBehavior>
              <Nav.Link>Users</Nav.Link>
            </Link>
            }
          </Nav>
          <Nav>
            {/* User Manual Button */}
            <Button 
              variant="outline-primary" 
              className="me-3" 
              onClick={handleOpenManual}
            >
              User Manual
            </Button>
            
            <NavDropdown title={session.user.name} id="basic-nav-dropdown">
              <NavDropdown.Item>
                <Row>
                  Previous login:
                </Row>
                <Row>
                  {session.user.previous_login
                    ? new Date(session.user.previous_login).toLocaleString()
                    : "No previous login"}
                </Row>
              </NavDropdown.Item>
              <NavDropdown.Item onClick={() => router.push('/users/edit/' + (session.user as Person).id)}>
                Edit profile
              </NavDropdown.Item>
              <NavDropdown.Item onClick={() => router.push('/password')}>
                Change password
              </NavDropdown.Item>
              <NavDropdown.Item onClick={() => signOut({ callbackUrl: '/signin' })}>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
