"use client";
import React, { useState, useEffect } from "react";
import { Button, Form, ListGroup, Spinner, Alert } from "react-bootstrap";
import { useSession } from "next-auth/react";
import ProjectWallComment from "./ProjectWallComment";

interface WallPost {
  id: number;
  title: string;
  description: string;
  created_at: string;
  person?: {
    id: string,
    name: string,
    lastname: string,
    username: string,
  };
}

interface ProjectWallProps {
  projectId: number;
  projectUsers: string;
}

const ProjectWall: React.FC<ProjectWallProps> = ({ projectId, projectUsers }) => {
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { data: session } = useSession();

  const isScrumMaster = (): boolean => {
    if (!session?.user?.username) return false;
    const roles = projectUsers.split("|").map(r => r.trim());
    return roles.includes(`Scrum Master: ${session.user.username}`);
  };  

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/project/${projectId}/wall`);
      if (!res.ok) throw new Error("Failed to load posts");
      const data = await res.json();
      setPosts(data);
      setError(null);
    } catch {
      setError("Error loading wall posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      const res = await fetch(`/api/project/${projectId}/wall?post_id=${postId}`, {
        method: "DELETE",
      });
  
      if (!res.ok) throw new Error("Failed to delete post");
      fetchPosts(); // Refresh list
    } catch {
      setError("Error deleting post");
    }
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/project/${projectId}/wall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, person_id: session?.user?.id }),
      });
      
      if (!res.ok) throw new Error("Failed to create post");
      setTitle("");
      setDescription("");
      fetchPosts();
    } catch {
      setError("Error creating post");
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [projectId]);

  const getRoleLabel = (username: string): string | null => {
    const roles = projectUsers.split("|").map(r => r.trim());
  
    if (roles.includes(`Product Owner: ${username}`)) return "Product Owner";
    if (roles.includes(`Scrum Master: ${username}`)) return "Scrum Master";
  
    const devEntry = roles.find(r => r.startsWith("Developers:"));
    if (devEntry && devEntry.includes(username)) return "Developer";
  
    return null;
  };
  

  return (
    <div>
      <h5 className="mb-3">Project Wall</h5>

      <Form onSubmit={handleSubmit} className="mb-4">
        <Form.Group className="mb-2">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Form.Group>
        <Button type="submit" variant="primary">Post</Button>
      </Form>

      {loading ? (
        <Spinner animation="border" />
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : posts.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <ListGroup>
            {posts.map(post => (
                <ListGroup.Item key={post.id} className="mb-4 p-4 border rounded shadow-sm bg-white">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">{post.title}</h5>
                    <p className="mb-2 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{post.description}</p>
                  </div>
                  <div className="text-end">
                    <small className="text-muted">
                      {new Date(post.created_at).toLocaleString()}
                    </small>
                    {(session?.user?.id?.toString() === post.person?.id?.toString() || isScrumMaster()) && (
                      <div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              
                <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                  <strong className="text-dark">{post.person?.username || "Anonymous"}</strong>
                  {getRoleLabel(post.person?.username || "") && (
                    <span
                    className={`badge ${
                      getRoleLabel(post.person?.username || "") === "Product Owner"
                        ? "bg-primary"
                        : getRoleLabel(post.person?.username || "") === "Scrum Master"
                        ? "bg-success"
                        : "bg-secondary"
                    }`}
                  >
                    {getRoleLabel(post.person?.username || "")}
                  </span>
                  
                  )}
                </div>
              
                <div>
                  <ProjectWallComment postId={post.id} projectId={projectId} projectUsers={projectUsers} />
                </div>
              </ListGroup.Item>             
            ))}
            </ListGroup>
      )}
    </div>
  );
};

export default ProjectWall;