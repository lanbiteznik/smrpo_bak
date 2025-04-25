import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { Subtask } from '@/types';
import { Developer } from '../Story';

interface AddTaskModalProps {
  show: boolean;
  onHide: () => void;
  storyId: number;
  developers: Developer[];
  isAllowedScrum: boolean;
  setError: (error: string | null) => void;
  onTaskCreated: (task: Subtask) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  show,
  onHide,
  storyId,
  developers,
  isAllowedScrum,
  setError,
  onTaskCreated
}) => {
  const [newSubtask, setNewSubtask] = useState<{
    description: string;
    story_id: number;
    time_required?: number;
    assignee?: number;
    priority?: number;
    finished?: boolean;
  }>({
    description: '',
    story_id: storyId,
    finished: false
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (show) {
      setNewSubtask({
        description: '',
        story_id: storyId,
        finished: false
      });
    }
  }, [show, storyId]);

  const handleAddSubtask = async () => {
    if (!newSubtask.description) {
      setError('Task description is required');
      return;
    }

    try {
      // Create a clean object with proper typing
      interface SubtaskSubmitData {
        description: string;
        story_id: number;
        time_required: number;
        assignee?: number;
        priority?: number;
      }

      const subtaskData: SubtaskSubmitData = {
        description: newSubtask.description,
        story_id: storyId,
        time_required: newSubtask.time_required || 0
      };
      
      if (newSubtask.assignee) {
        subtaskData.assignee = newSubtask.assignee;
      }
      
      if (newSubtask.priority) {
        subtaskData.priority = newSubtask.priority;
      }

      const response = await fetch('/api/subtask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subtaskData),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || 'Failed to create task');
      }
      
      // Add the new subtask to the list via callback
      onTaskCreated(responseData);
    } catch (error: unknown) {
      console.error('Error adding subtask:', error);
      if (error instanceof Error) {
        setError(error.message || 'Failed to add task');
      } else {
        setError('Failed to add task');
      }
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add Task</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              type="text"
              value={newSubtask.description}
              onChange={(e) => setNewSubtask({
                ...newSubtask,
                description: e.target.value
              })}
              placeholder="Task description"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Time Required (hours)</Form.Label>
            <Form.Control
              type="number"
              value={newSubtask.time_required || ''}
              onChange={(e) => setNewSubtask({
                ...newSubtask,
                time_required: e.target.value ? parseInt(e.target.value) : undefined
              })}
              placeholder="Time estimate"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Assign To</Form.Label>
            <Form.Select
              value={newSubtask.assignee || ''}
              onChange={(e) => setNewSubtask({
                ...newSubtask,
                assignee: e.target.value ? parseInt(e.target.value) : undefined
              })}
              disabled={!isAllowedScrum} // Only Scrum Master can assign tasks
            >
              <option value="">Select Developer</option>
              {developers.map(dev => (
                <option key={dev.id} value={dev.id}>
                  {dev.name} {dev.lastname}
                </option>
              ))}
            </Form.Select>
            {!isAllowedScrum && (
              <Form.Text className="text-muted">
                Only the Scrum Master can assign tasks to team members.
              </Form.Text>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Priority</Form.Label>
            <Form.Select
              value={newSubtask.priority || ''}
              onChange={(e) => setNewSubtask({
                ...newSubtask,
                priority: e.target.value ? parseInt(e.target.value) : undefined
              })}
            >
              <option value="">Select Priority</option>
              <option value="1">Low</option>
              <option value="2">Medium</option>
              <option value="3">High</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleAddSubtask} disabled={!newSubtask.description.trim()}>
          Add Task
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddTaskModal;
