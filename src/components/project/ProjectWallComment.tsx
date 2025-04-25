"use client";
import React, { useState } from "react";
import { Button, Form, ListGroup, Spinner, Alert } from "react-bootstrap";
import { useSession } from "next-auth/react";
import { TrashFill } from "react-bootstrap-icons";

interface Comment {
  id: number;
  description: string;
  created_at: string;
  person_id: number;
  person?: {
    id: string;
    name: string;
    lastname: string;
    username: string;
  };
}

interface ProjectWallCommentProps {
  postId: number;
  projectId: number;
  projectUsers: string;
  userRole?: string;
}

const ProjectWallComment: React.FC<ProjectWallCommentProps> = ({ 
  postId, 
  projectId,
  projectUsers
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const { data: session } = useSession();

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/project/${projectId}/wall/comment?post_id=${postId}`);
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();
      setComments(data);
      setError(null);
    } catch {
      setError("Error loading comments");
    } finally {
      setLoading(false);
    }
  };

  const isScrumMaster = (): boolean => {
    if (!session?.user?.username) return false;
    const roles = projectUsers.split("|").map(r => r.trim());
    return roles.includes(`Scrum Master: ${session.user.username}`);
  };
  

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/project/${projectId}/wall/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          description: comment, 
          person_id: session?.user?.id,
          wall_post_id: postId
        }),
      });
      
      if (!res.ok) throw new Error("Failed to add comment");
      setComment("");
      fetchComments();
    } catch {
      setError("Error adding comment");
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }
    
    setDeleteLoading(commentId);
    try {
      const res = await fetch(
        `/api/project/${projectId}/wall/comment?comment_id=${commentId}`, 
        {
          method: "DELETE",
        }
      );
      
      if (!res.ok) throw new Error("Failed to delete comment");
      
      // Remove the comment from the list
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch {
      setError("Error deleting comment");
    } finally {
      setDeleteLoading(null);
    }
  };
  
  const canDeleteComment = (comment: Comment) => {
    if (!session?.user?.id) return false;
    
    // User can delete their own comments
    const isAuthor = Number(session.user.id) === comment.person_id;
    
    return isAuthor || isScrumMaster();
  };

  return (
    <div className="mt-2">
      <Button 
        variant="link" 
        className="p-0 text-decoration-none" 
        onClick={toggleComments}
      >
        {showComments ? "Hide comments" : "Show comments"}
      </Button>
      
      {showComments && (
        <>
          <Form onSubmit={handleSubmitComment} className="mt-2 mb-3">
            <Form.Group className="d-flex">
              <Form.Control
                type="text"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                size="sm"
              />
              <Button type="submit" variant="outline-primary" size="sm" className="ms-2">
                Post
              </Button>
            </Form.Group>
          </Form>

          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : comments.length === 0 ? (
            <p className="text-muted small">No comments yet.</p>
          ) : (
            <ListGroup variant="flush" className="small">
              {comments.map(comment => (
                <ListGroup.Item key={comment.id} className="py-2 px-0 border-bottom">
                  <div className="d-flex justify-content-between">
                    <div>
                      <span className="fw-bold">{comment.person?.username || "Anonymous"}</span>
                      <span className="ms-2" style={{ whiteSpace: 'pre-wrap' }}>{comment.description}</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <small className="text-muted me-2">
                        {new Date(comment.created_at).toLocaleString()}
                      </small>
                      {canDeleteComment(comment) && (
                        <Button 
                          variant="link" 
                          className="p-0 text-danger" 
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deleteLoading === comment.id}
                          title="Delete comment"
                        >
                          {deleteLoading === comment.id ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            <TrashFill size={14} />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectWallComment;
