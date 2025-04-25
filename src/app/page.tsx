"use client";
import React, { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/login/AuthGuard";
import ProjectBoard from "@/components/project/ProjectBoard";
import AddProjectButton from "@/components/project/AddProjectButton";
import { useSession } from "next-auth/react";
import { Person } from "@/app/models/models";
import { Container, Row, Col } from "react-bootstrap";

interface Project {
  id: number;
  title: string;
  description: string;
  users: string;
  created_at: string;
}

export default function Home() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/allProjects");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();
      setProjects(data);
      setLoading(false);
    } catch (error) {
      console.log("Error fetching projects:", error);
      setError("Error loading projects");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (!session?.user) {
    return (
      <AuthGuard>
        <Container className="mt-4">
          <h1 className="text-4xl font-bold mb-8">Please log in to view your projects</h1>
        </Container>
      </AuthGuard>
    );
  }

  const user = session.user as Person;
  const isAdmin = user.role === 2;

  const filteredProjects = projects.filter((project) => {
    if (isAdmin) return true;
  
    const username = user.username;
  
    return project.users
      .split('|')
      .some(role => {
        const [, names] = role.split(':').map(part => part.trim());
        if (!names) return false;
  
        return names
          .split(',')
          .map(name => name.trim())
          .includes(username);
      });
  });

  const handleProjectAdded = async () => {
    try {
      const response = await fetch("/api/allProjects");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const newData = await response.json();

      setProjects(newData);
    } catch (error) {
      console.error("Error updating projects:", error);
    }
  };

  return (
    <AuthGuard>
      <Container>
        <Row>
          <Col md={10}>
            <h1 className="text-4xl font-bold mb-8 mt-4">Scrum Board</h1>
          </Col>
          <Col md={2}>
            {isAdmin && <AddProjectButton onProjectAdded={handleProjectAdded} />}
          </Col>
        </Row>

        {loading ? (
          <p>Loading projects...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <Row key={project.id} className="mb-4 mt-4">
                <Col>
                  <ProjectBoard project={project} />
                </Col>
              </Row>
            ))
          ) : (
            <p className="text-gray-500">No projects available.</p>
          )
        )}
      </Container>
    </AuthGuard>
  );
}