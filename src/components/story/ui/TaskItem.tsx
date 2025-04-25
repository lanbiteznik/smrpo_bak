import React from 'react';
import { ListGroup, Form, Button } from 'react-bootstrap';
import { Subtask } from '@/types';

interface TaskItemProps {
  subtask: Subtask;
  currentUserId?: number;
  isAllowedScrumDev: boolean;
  onComplete: (subtaskId: number, isCompleted: boolean) => void;
  onClaim: (subtaskId: number) => void;
  onAccept: (subtaskId: number) => void;
  onReject: (subtaskId: number) => void;
  onEdit: (subtask: Subtask) => void;
  onDelete: (subtaskId: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  subtask,
  currentUserId,
  isAllowedScrumDev,
  onComplete,
  onClaim,
  onAccept,
  onReject,
  onEdit,
  onDelete
}) => {
  // Helper function to get task status

  return (
    <ListGroup.Item className="d-flex align-items-center justify-content-between">
      <div className="me-2">
        <Form.Check 
          type="checkbox"
          id={`subtask-${subtask.id}`}
          checked={subtask.finished || false}
          onChange={(e) => onComplete(subtask.id!, e.target.checked)}
          disabled={
            // Disable if task is unassigned (must be claimed first)
            subtask.assignee === null ||
            // Disable if assigned to someone else
            (subtask.assignee !== null && Number(subtask.assignee) !== Number(currentUserId)) ||
            // OR if assigned to this user but not accepted yet
            (subtask.assignee !== null && Number(subtask.assignee) === Number(currentUserId) && subtask.rejected === null)
          }
          label={
            <div>
              <span className={subtask.finished ? 'text-decoration-line-through' : ''}>
                {subtask.description}
              </span>
              
              {/* Show assignment status */}
              {subtask.assignee && (
                <small className={`ms-2 ${Number(subtask.assignee) === Number(currentUserId) ? 'text-primary' : 'text-muted'}`}>
                  {Number(subtask.assignee) === Number(currentUserId) ? '(Assigned to you)' : '(Assigned to another developer)'}
                </small>
              )}
            </div>
          }
        />
      </div>
      
      <div className="d-flex">
        {/* Claim button - only show if task is unassigned */}
        {currentUserId && !subtask.assignee && (
          <Button 
            variant="outline-primary" 
            size="sm"
            className="me-1"
            onClick={() => onClaim(subtask.id!)}
          >
            Claim
          </Button>
        )}
        
        {/* Accept button - only show to the assignee if task isn't accepted yet */}
        {currentUserId && Number(subtask.assignee) === Number(currentUserId) && !subtask.accepted && !subtask.finished && (
          <Button 
            variant="outline-success" 
            size="sm"
            className="me-1"
            onClick={() => onAccept(subtask.id!)}
          >
            Accept
          </Button>
        )}
        
        {/* Rejection button - show to the assignee for pending OR accepted tasks */}
        {currentUserId && Number(subtask.assignee) === Number(currentUserId) && !subtask.finished && 
          (subtask.rejected === false || subtask.rejected === null) && (
          <Button 
            variant="outline-danger" 
            size="sm"
            className="me-1"
            onClick={() => onReject(subtask.id!)}
          >
            Reject
          </Button>
        )}
        
        {/* Edit button - show to Scrum Master and developers */}
        {(isAllowedScrumDev) && (
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="me-1"
            onClick={() => onEdit(subtask)}
          >
            Edit
          </Button>
        )}
        
        {/* Delete button - show to Scrum Master and developers */}
        {isAllowedScrumDev && (subtask.rejected === true || subtask.rejected === null) && (
          <Button 
            variant="outline-danger" 
            size="sm"
            onClick={() => onDelete(subtask.id!)}
          >
            Delete
          </Button>
        )}
      </div>
    </ListGroup.Item>
  );
};

export default TaskItem;
