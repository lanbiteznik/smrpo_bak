"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Container, Row, Col, Button, ListGroup, Spinner, Alert } from "react-bootstrap";
import SprintBoard from "@/components/sprint/SprintBoard";
import AddSprintButton from "@/components/sprint/AddSprintButton";
import { useSession } from "next-auth/react";

interface Sprint {
    id: number;
    title: string;
    start_date: string;
    finish_date: string;
    project_id: number;
}

interface Project {
    id: number;
    users: string;
}

const SprintList: React.FC = () => {
    const params = useParams();
    const projectId = params?.id ? Number(params.id) : null;
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectTitle, setProjectTitle] = useState<string | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const { data: session } = useSession();
    const [isAllowed, setIsAllowed] = useState(false);

    // Fetch project details
    const fetchProject = useCallback(async () => {
        if (projectId === null) return;
        try {
            const response = await fetch(`/api/project/${projectId}`);
            if (!response.ok) throw new Error("Failed to fetch project");

            const data = await response.json();
            setProject(data);
            setProjectTitle(data.title);
        } catch (error) {
            console.error("Error fetching project:", error);
            setError("Failed to load project.");
        }
    }, [projectId]);

    // Check user permissions
    useEffect(() => {
        if (session?.user?.username && project?.users) {
            const username = session.user.username;
            const usersList = project.users;
            const isAdmin = session?.user?.role === 2; // Admin role is 2
            
            setIsAllowed(
                isAdmin ||
                usersList.includes(`Scrum Master: ${username} `)
            );
        }
    }, [session, project]);

    // Fetch sprints
    const fetchSprints = useCallback(async () => {
        if (projectId === null) return;
        try {
            const response = await fetch(`/api/project/${projectId}/sprints`);
            if (!response.ok) throw new Error("Failed to fetch sprints");

            const data = await response.json();
            // Razvrstimo sprinte od najnovejšega (max start_date) navzdol
            const sortedSprints = data.sort((a: Sprint, b: Sprint) =>
                new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            );
            setSprints(sortedSprints);
            setError(null);
        } catch (error) {
            console.error("Error fetching sprints:", error);
            setError("Failed to load sprints. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId === null) return;
        fetchProject();
        fetchSprints();
    }, [fetchProject, fetchSprints, projectId]);

    if (loading) return <Spinner animation="border" role="status" />;

    return (
        <Container>
            <Row className="mb-4 mt-4">
                <Col>
                    <h2>Sprints for project: {projectTitle || "Loading..."}</h2>
                </Col>
                <Col xs="auto" className="d-flex gap-2">
                    {projectId !== null && isAllowed && (
                        <AddSprintButton projectId={projectId} onSprintAdded={fetchSprints} />
                    )}
                    <Button variant="secondary" onClick={() => window.history.back()}>
                        Back to Project
                    </Button>
                </Col>
            </Row>

            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    {error}
                </Alert>
            )}

            {sprints.length === 0 ? (
                <ListGroup.Item>No sprints available</ListGroup.Item>
            ) : (
                sprints.map((sprint) => (
                    <div key={sprint.id} className="mb-4">
                        <SprintBoard sprintNumber={sprint.id} onSprintDeleted={fetchSprints} projectId={projectId ?? 0} />
                    </div>
                ))
            )}
        </Container>
    );
};

export default SprintList;