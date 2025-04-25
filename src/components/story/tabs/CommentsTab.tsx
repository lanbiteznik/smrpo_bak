import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Alert, ListGroup, Spinner } from 'react-bootstrap';
import { StoryProps, Comment } from '../Story';
import CommentItem from '../ui/CommentItem';

interface CommentsTabProps {
  story: StoryProps['story'];
  isAllowedScrum: boolean;
  currentUserId: number | undefined;
  setError: (error: string | null) => void;
}

const CommentsTab: React.FC<CommentsTabProps> = ({
  story,
  isAllowedScrum,
  currentUserId,
  setError
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const STORY_PREFIX = '__STORY_COMMENT__';
  const getStoryPrefix = (storyId: number) => `${STORY_PREFIX}[${storyId}]::`;

  const removeStoryPrefix = (text: string | undefined, storyId: number): string => {
    if (!text) return ''; // handle undefined/null
    const prefix = `__STORY_COMMENT__[${storyId}]::`;
    return text.startsWith(prefix) ? text.slice(prefix.length) : text;
  };

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!story.id) return;
  
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/story/${story.id}/comments`); // 👈 fetch all comments (not story-specific endpoint)
      if (response.ok) {
        const data = await response.json();
        const prefix = getStoryPrefix(story.id!);
  
        const filtered = data
          .filter((comment: Comment) => comment.content?.startsWith(prefix))
          .map((comment: Comment) => ({
            ...comment,
            content: comment.content.replace(prefix, '')
          }));
  
        setComments(filtered);
      } else {
        console.error('Failed to fetch comments:', response.statusText);
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [story.id]);
  

  // Load comments when component mounts
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setSubmittingComment(true);
    setError(null);

    try {
      const fullContent = `${getStoryPrefix(story.id!)}${newComment}`;

      const response = await fetch(`/api/story/${story.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fullContent,
          author_id: currentUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }

      const newCommentData = await response.json();

      // Add the new comment to the list
      setComments([...comments, newCommentData]);
      
      // Clear the input
      setNewComment('');
      
    } catch (error) {
      console.error('Error adding comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle editing a comment
  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditingCommentText(comment.content);
  };

  // Handle updating a comment
  const handleUpdateComment = async () => {
    if (!editingComment || !editingCommentText.trim()) {
      setError('Comment content cannot be empty');
      return;
    }
  
    setSubmittingComment(true);
    setError(null);
  
    try {
      const fullContent = `${getStoryPrefix(story.id!)}${editingCommentText}`;

      const response = await fetch(`/api/story/${story.id}/comments/${editingComment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fullContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update comment');
      }
  
      const updatedComment = await response.json();
  
      // Update the comment in the list
      setComments(comments.map(c => 
        c.id === editingComment.id ? updatedComment : c
      ));
      
      // Clear editing state
      setEditingComment(null);
      setEditingCommentText('');
    } catch (error) {
      console.error('Error updating comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to update comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId: number) => {
    setDeletingCommentId(commentId);
    setError(null);
  
    try {
      const response = await fetch(`/api/story/${story.id}/comments/${commentId}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete comment');
      }
  
      // Remove the comment from the list
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditingCommentText('');
  };

  return (
    <div className="comments-section">
      {loadingComments ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" /> Loading comments...
        </div>
      ) : (
        <>
          <div className="comment-list mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {comments.length === 0 ? (
              <Alert variant="info">No comments yet. Be the first to add one!</Alert>
            ) : (
              <ListGroup variant="flush">
              {comments.map(comment => (
                <CommentItem 
                  key={comment.id}
                  comment={{
                    ...comment,
                    content: removeStoryPrefix(comment.content, story.id!)
                  }}
                  isEditing={editingComment?.id === comment.id}
                  editingText={editingCommentText}
                  setEditingText={setEditingCommentText}
                  isDeleting={deletingCommentId === comment.id}
                  submitting={submittingComment}
                  isAllowedToEdit={isAllowedScrum}
                  onEdit={() => handleEditComment(comment)}
                  onUpdate={handleUpdateComment}
                  onCancelEdit={handleCancelEdit}
                  onDelete={() => handleDeleteComment(comment.id!)}
                />
              ))}

            </ListGroup>

            )}
          </div>
          
          {
            <div className="add-comment-form">
              <Form.Group>
                <Form.Label>Add Comment</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write your comment here..."
                />
              </Form.Group>
              <Button 
                variant="primary" 
                className="mt-2"
                onClick={handleAddComment}
                disabled={submittingComment || !newComment.trim()}
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
        }
        </>
      )}
    </div>
  );
};

export default CommentsTab;
