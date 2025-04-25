import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { Subtask } from '@/types';
import { Developer } from '../Story';

interface EditTaskModalProps {
  show: boolean;
  onHide: () => void;
  subtask: Subtask | null;
  developers: Developer[];
  isAllowedScrum: boolean;
  onTaskUpdated: (task: Subtask) => void;
  onTaskDeleted: (id: number) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  show,
  onHide,
  subtask,
  developers,
  onTaskUpdated
}) => {
  const [editingSubtask, setEditingSubtask] = useState<{
    id: number | null;
    description: string;
    time_required?: number;
    assignee?: number;
    priority?: number;
    rejected?: boolean;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show && subtask) {
      setEditingSubtask({
        id: subtask.id || null,
        description: subtask.description || '',
        time_required: subtask.time_required,
        assignee: subtask.assignee,
        priority: subtask.priority,
        rejected: subtask.rejected
      });
      setError(null);
    }
  }, [show, subtask]);

  const handleUpdateSubtask = async () => {
    if (!editingSubtask) return;
    
    try {
      const response = await fetch(`/api/subtask/${editingSubtask.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingSubtask),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update task');
        return;
      }
      
      const updatedSubtask = await response.json();
      
      // Update the subtask in the list via callback
      onTaskUpdated(updatedSubtask);
    } catch (error) {
      console.error('Error updating subtask:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Task</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              type="text"
              value={editingSubtask?.description || ''}
              onChange={(e) => setEditingSubtask(prev => ({
                ...prev!,
                description: e.target.value
              }))}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Time Required (hours)</Form.Label>
            <Form.Control
              type="number"
              value={editingSubtask?.time_required || ''}
              onChange={(e) => setEditingSubtask(prev => ({
                ...prev!,
                time_required: e.target.value ? parseFloat(e.target.value) : undefined
              }))}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Assign To</Form.Label>
            <Form.Select
              value={editingSubtask?.assignee || ''}
              onChange={(e) => setEditingSubtask(prev => ({
                ...prev!,
                assignee: e.target.value ? parseInt(e.target.value) : undefined
              }))}
              disabled={editingSubtask?.rejected === false}
            >
              <option value="">Select Developer</option>
              {developers.map(dev => (
                <option key={dev.id} value={dev.id}>
                  {dev.name} {dev.lastname}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Priority</Form.Label>
            <Form.Select
              value={editingSubtask?.priority || ''}
              onChange={(e) => setEditingSubtask(prev => ({
                ...prev!,
                priority: e.target.value ? parseInt(e.target.value) : undefined
              }))}
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
        <Button
          variant="primary"
          onClick={handleUpdateSubtask}
        >
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditTaskModal;
