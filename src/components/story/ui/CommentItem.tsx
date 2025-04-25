import React from 'react';
import { ListGroup, Form, Button, Spinner } from 'react-bootstrap';
import { Comment } from '../Story';

interface CommentItemProps {
  comment: Comment;
  isEditing: boolean;
  editingText: string;
  setEditingText: (text: string) => void;
  isDeleting: boolean;
  submitting: boolean;
  isAllowedToEdit: boolean;
  onEdit: () => void;
  onUpdate: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isEditing,
  editingText,
  setEditingText,
  isDeleting,
  submitting,
  isAllowedToEdit,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete
}) => {
  // Format date for display
  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <ListGroup.Item className="py-3">
      {isEditing ? (
        // Edit mode
        <div>
          <Form.Group>
            <Form.Control
              as="textarea"
              rows={3}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
            />
          </Form.Group>
          <div className="mt-2 d-flex gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={onUpdate}
              disabled={submitting || !editingText.trim()}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" /> Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={onCancelEdit}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // View mode
        <>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <strong>{comment.author?.name || 'Unknown User'}</strong>
              <span className="text-muted ms-2 small">
                {comment.created_at && formatDate(comment.created_at)}
                {comment.updated_at && comment.updated_at !== comment.created_at && 
                  ' (edited)'}
              </span>
            </div>
            
            {isAllowedToEdit && (
              <div className="comment-actions">
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 text-decoration-none me-2"
                  onClick={onEdit}
                >
                  Edit
                </Button>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 text-decoration-none text-danger"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Spinner animation="border" size="sm" /> Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            )}
          </div>
          <pre className="mb-0" style={{ 
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontFamily: 'inherit',
            margin: 0
          }}>
            {comment.content}
          </pre>
        </>
      )}
    </ListGroup.Item>
  );
};

export default CommentItem;
