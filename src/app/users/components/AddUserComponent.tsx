"use client";
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import AuthGuard from '@/components/login/AuthGuard';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AddUserPage() {
  // Always call hooks in the same order
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    lastname: '',
    role: 1,
  });
  const [statusMsg, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/signin');
    }
  }, [session, status, router]);

  // Now conditionally render
  if (status === 'loading' || !session) return null;

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setStatus('User created successfully!');
        setFormData({
          username: '',
          name: '',
          email: '',
          password: '',
          lastname: '',
          role: 1,
        });
        // Refresh the users list
        router.refresh();
      } else {
        const errorData = await res.json();
        setStatus(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('An unexpected error occurred.');
    }
  };

  return (
    <AuthGuard>
      <Container>
        {/* ...existing page markup... */}
        <Row className="my-4">
          <Col>
            <h1>Add User</h1>
          </Col>
        </Row>
        <Row>
          <Col md={{ span: 6, offset: 3 }}>
            <Form onSubmit={handleSubmit}>
              {/* ...existing form groups... */}
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter last name" 
                  name="lastname" 
                  value={formData.lastname} 
                  onChange={handleChange} 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  type="email" 
                  placeholder="Enter email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter username" 
                  name="username" 
                  value={formData.username} 
                  onChange={handleChange} 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  placeholder="Enter password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  name="role"
                  value={formData.role}
                  // handle role change
                  onChange={handleChange}
                  >
                      <option value={1}>Developer</option>
                      <option value={2}>Admin</option>
                  </Form.Select>
              </Form.Group>
              <Button variant="primary" type="submit">
                Add User
              </Button>
            </Form>
            {statusMsg && <p className="mt-3">{statusMsg}</p>}
          </Col>
        </Row>
      </Container>
    </AuthGuard>
  );
}
