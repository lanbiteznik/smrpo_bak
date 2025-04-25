"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Button, Container, Modal } from "react-bootstrap";
import { useSession } from "next-auth/react";
import { Person } from "@/app/models/models";

export default function EditUserForm({ initialData }: { initialData: {username: string, email: string, role: number, id: number} }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState(initialData.username);
  const [email, setEmail] = useState(initialData.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialData.role);
  const [showErrorModal, setShowErrorModal] = useState(false);

  console.log(initialData);
  console.log(session?.user);

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/person", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: initialData.id,
        username,
        email,
        role,
        password: password || undefined,
      }),
    });
    if (res.ok) {
      if (session?.user?.role === 2) {
        router.push("/users");
      }
      else {
        router.push("/");
      }
    } else {
      setShowErrorModal(true);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        {/* ...existing form layout... */}
        <Form.Group controlId="formUsername">
          <Form.Label>Username</Form.Label>
          <Form.Control
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formEmail">
          <Form.Label>Email</Form.Label>
          <Form.Control
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        {(session?.user as Person).role === 2 &&
          <Form.Group controlId="formPassword" className="mt-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep unchanged"
            />
          </Form.Group>
        }

        <Form.Group controlId="formRole" className="mt-3">
          <Form.Label>Role</Form.Label>
          <Form.Select
            value={role}
            onChange={(e) => setRole(Number(e.target.value))}
            disabled={(session?.user as Person).role !== 2}
          >
            <option value={1}>Developer</option>
            <option value={2}>Admin</option>
          </Form.Select>
        </Form.Group>
        <Button type="submit" className="mt-3">
          Save
        </Button>
        <Button variant="secondary" className="mt-3 ms-2" onClick={() => router.push("/users")}>
          Cancel
        </Button>
      </Form>

      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>There was an error updating the user.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowErrorModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
