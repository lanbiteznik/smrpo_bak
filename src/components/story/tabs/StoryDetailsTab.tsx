import React, { useState, useEffect } from 'react';
import { Form, Button, Badge, Alert, Modal } from 'react-bootstrap';
import { validateEstimation, isEstimationRealistic } from '@/services/estimationService';
import { StoryProps } from '../Story';

interface StoryDetailsTabProps {
  story: StoryProps['story'];
  isInSprint: boolean;
  isAllowedScrum: boolean;
  canBeMoved: boolean;
  onMove?: (destination: string) => void;
  onUpdate: () => void;
  onHide: () => void;
  checkDuplicateTitle: (title: string, storyId: number, projectId: number) => Promise<boolean>;
  setError: (error: string | null) => void;
  setWarning: (warning: string | null) => void;
}

const StoryDetailsTab: React.FC<StoryDetailsTabProps> = ({
  story,
  isInSprint,
  isAllowedScrum,
  canBeMoved,
  onMove,
  onUpdate,
  onHide,
  checkDuplicateTitle,
  setError,
  setWarning
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeRequired, setTimeRequired] = useState<number | undefined>(undefined);
  const [businessValue, setBusinessValue] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<number | undefined>(undefined);
  const [tests, setTests] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [originalTitle, setOriginalTitle] = useState('');

  useEffect(() => {
    setTitle(story.title || '');
    setOriginalTitle(story.title || '');
  }, [story]);
  
  // Update state values when story changes
  useEffect(() => {
    setTitle(story.title || '');
    setDescription(story.description || '');
    setTimeRequired(story.time_required);
    setBusinessValue(story.business_value);
    setPriority(story.priority);
    setTests(story.tests || '');
  }, [story]);

  // Handle saving story details
  const handleSave = async () => {
    // Validate the title
    if (!title.trim()) {
      setError('Story title is required');
      return;
    }
  
    try {
      // Check for duplicate titles within the same project
      const titleHasChanged = title.trim() !== originalTitle.trim();

      if (titleHasChanged) {
        const isDuplicate = await checkDuplicateTitle(title, story.id, story.project_id || 0);
        if (isDuplicate) {
          setError('A story with this title already exists in this project. Please use a different title.');
          return;
        }
      }
  
      // Prepare the data object, with optional time_required
      const updateData = {
        title,
        description,
        business_value: businessValue,
        priority,
        tests,
        ...(isInSprint ? {} : { time_required: timeRequired })
      };
  
      // First save story details
      const response = await fetch(`/api/story/${story.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update story');
        return;
      }
  
      onUpdate();
      onHide();
    } catch (error) {
      console.error('Error updating story:', error);
      setError('An unexpected error occurred');
    }
  };

  // Handle deleting story
  const handleDeleteStory = async () => {
    try {
      const response = await fetch(`/api/story/${story.id}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete story');
      }
  
      // Close the story modal and refresh the list
      onHide();
      onUpdate();
    } catch (error) {
      console.error('Error deleting story:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete story');
    }
  };

  // Check if all tasks are completed
  const areAllTasksCompleted = () => {
    if (!story.subtasks || story.subtasks.length === 0) return false;
    return story.subtasks.every(task => task.finished);
  };

  // Get priority label and variant
  let priorityLabel = '';
  let priorityVariant = '';
  
  switch (story.priority) {
    case 1:
      priorityLabel = "Won't Have This Time";
      priorityVariant = 'secondary';
      break;
    case 2:
      priorityLabel = 'Could Have';
      priorityVariant = 'info';
      break;
    case 3:
      priorityLabel = 'Should Have';
      priorityVariant = 'warning';
      break;
    case 4:
      priorityLabel = 'Must Have';
      priorityVariant = 'danger';
      break;
    default:
      priorityLabel = 'Unknown';
      priorityVariant = 'light';
  }

  return (
    <div>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isAllowedScrum}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAllowedScrum}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Acceptance Tests</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={tests}
            onChange={(e) => setTests(e.target.value)}
            disabled={!isAllowedScrum}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Time Required (Story Points)</Form.Label>
          <Form.Control
            type="number"
            value={timeRequired || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setTimeRequired(isNaN(value) ? undefined : value);
              
              // Validate estimation
              const validation = validateEstimation(value);
              if (!validation.valid) {
                setWarning(validation.message);
              } else {
                setWarning(null);
                
                // Check if estimation is realistic
                const realisticCheck = isEstimationRealistic(value);
                if (!realisticCheck.realistic) {
                  setWarning(realisticCheck.message);
                }
              }
            }}
            disabled={isInSprint || !isAllowedScrum}
          />
          {isInSprint && (
            <Form.Text className="text-muted">
              Time estimation cannot be changed for stories in a sprint.
            </Form.Text>
          )}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Business Value</Form.Label>
          <Form.Control
            type="number"
            value={businessValue || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setBusinessValue(isNaN(value) ? undefined : value);
            }}
            disabled={!isAllowedScrum}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Priority</Form.Label>
          <Form.Select
            value={priority || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setPriority(isNaN(value) ? undefined : value);
            }}
            disabled={!isAllowedScrum}
          >
            <option value="">Select Priority</option>
            <option value="1">Won&#39;t Have This Time</option>
            <option value="2">Could Have</option>
            <option value="3">Should Have</option>
            <option value="4">Must Have</option>
          </Form.Select>
        </Form.Group>
        
        <div className="mt-4">
          <h5>Story Status</h5>
          <div>
            <Badge bg={priorityVariant} className="me-2">{priorityLabel}</Badge>
            {story.time_required && (
              <Badge bg="primary" className="me-2">{story.time_required} points</Badge>
            )}
            {story.business_value && (
              <Badge bg="success">Value: {story.business_value}</Badge>
            )}
            {story.active && (
              <Badge bg="info" className="ms-2">Active</Badge>
            )}
            {story.finished && (
              <Badge bg="success" className="ms-2">Finished</Badge>
            )}
          </div>
        </div>
        
        {canBeMoved && isAllowedScrum && (
          <div className="mt-4">
            <h5>Move Story</h5>
            <div className="d-flex gap-2">
              {/* Backward movement */}
              {story.active && !story.finished && (
                <Button size="sm" variant="outline-secondary" onClick={() => onMove && onMove('sprintBacklog')}>
                  Move Back to Sprint Backlog
                </Button>
              )}
              
              {/* Forward movement - Option to move to In Progress if we're not already active */}
              {!story.active && !story.finished && (
                <Button size="sm" variant="outline-primary" onClick={() => onMove && onMove('inProgress')}>
                  Move to In Progress
                </Button>
              )}

              {/* Button to explicitly move from Review to In Progress - We know we're in Review if tasks are completed */}
              {story.active && !story.finished && areAllTasksCompleted() && (
                <Button size="sm" variant="outline-warning" onClick={() => onMove && onMove('inProgress')}>
                  Move Back to In Progress
                </Button>
              )}
              
              {/* From Review, can move forward to Done */}
              {story.active && !story.finished && (
                <Button size="sm" variant="outline-success" onClick={() => onMove && onMove('done')}>
                  Mark as Done
                </Button>
              )}

              {/* Always allow moving to Product Backlog */}
              {story.sprint_id && (
                <Button size="sm" variant="outline-secondary" onClick={() => onMove && onMove('productBacklog')}>
                  Move to Product Backlog
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Save and delete buttons - only show if story is editable */}
        {isAllowedScrum && !story.finished && !story.sprint_id && (
          <>
            <hr />
              <div className="d-flex justify-content-between">
                <div>
                  <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    Delete Story
                  </Button>
                </div>
                <div className="d-flex gap-2">
                  <Button variant="secondary" onClick={onHide}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
          </>
        )}

        {/* Show warning if story can't be edited */}
        {isAllowedScrum && (story.finished || story.sprint_id) && (
          <Alert variant="info" className="mt-3">
            {story.finished ? 
              "This story has been realized and cannot be edited." : 
              "This story is assigned to a sprint and cannot be edited."}
          </Alert>
        )}
      </Form>

      {/* Delete confirmation modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this story? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteStory}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default StoryDetailsTab;
