"use client";
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup } from 'react-bootstrap';

interface Story {
  id: number;
  title: string;
  time_required: number | null;
  business_value: number | null;
  priority: number | null;
  finished: boolean;
  sprint_id: number;
}

interface AddSprintModalProps {
  show: boolean;
  projectId: number;
  onHide: () => void;
  onSuccess: () => void;
}

const AddSprintModal: React.FC<AddSprintModalProps> = ({ show, projectId, onHide, onSuccess }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [velocity, setVelocity] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStories, setSelectedStories] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);

  // Fetch available stories when modal is shown
  useEffect(() => {
    const fetchStories = async () => {
      if (!show) return;

      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/project/${projectId}/stories`);
        if (!res.ok) {
          throw new Error('Failed to fetch stories');
        }
        
        const data = await res.json();
        
        // Filter out stories that are already in a sprint
        const availableStories = data.filter((story: Story) => !story.sprint_id);
        setStories(availableStories);
      } catch (err) {
        setError('Error fetching stories');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStories();
  }, [show, projectId]);

  // Update total story points when selection changes
  useEffect(() => {
    // Calculate total points from selected stories
    const points = selectedStories.reduce((sum, storyId) => {
      const story = stories.find(s => s.id === storyId);
      return sum + (story?.time_required || 0);
    }, 0);
    
    setTotalPoints(points);
  }, [selectedStories, stories]);

  const handleStorySelection = (storyId: number) => {
    setSelectedStories(prev => {
      if (prev.includes(storyId)) {
        return prev.filter(id => id !== storyId);
      } else {
        return [...prev, storyId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);
    
    try {
      const sprintData = {
        start_date: startDate,
        finish_date: endDate,
        velocity: velocity || totalPoints,
        project_id: projectId,
        stories: selectedStories
      };
      
      const response = await fetch('/api/sprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sprintData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sprint');
      }
      
      // Reset form
      setStartDate('');
      setEndDate('');
      setVelocity('');
      setSelectedStories([]);
      
      // Close modal and refresh sprints list
      onSuccess();
      onHide();
    } catch (err) {
      console.error('Error creating sprint:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setVelocity('');
    setSelectedStories([]);
  };

  const priorityMapping: { [key: string]: number } = {
    "won't have this time": 1,
    "could have": 2,
    "should have": 3,
    "must have": 4,
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Create New Sprint</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          
          <Form.Group className="mb-3">
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Velocity</Form.Label>
            <Form.Control
              type="number"
              value={velocity}
              onChange={(e) => setVelocity(e.target.value)}
            />
            <Form.Text className="text-muted">
              Current sprint load from selected stories: {totalPoints} points
            </Form.Text>
          </Form.Group>
          
          <hr />
          
          <h5>Select Stories for Sprint</h5>
          
          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading stories...</p>
            </div>
          ) : stories.length === 0 ? (
            <Alert variant="info">
              No available stories found. Please add stories to the product backlog first.
            </Alert>
          ) : (
            <ListGroup className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {stories.map(story => (
                <ListGroup.Item 
                  key={story.id} 
                  className={story.time_required ? '' : 'text-muted'}
                >
                  <div className="d-flex align-items-center">
                    <Form.Check 
                      type="checkbox"
                      id={`story-${story.id}`}
                      checked={selectedStories.includes(story.id)}
                      onChange={() => story.time_required ? handleStorySelection(story.id) : null}
                      disabled={!story.time_required}
                      className="me-3"
                    />
                    <div>
                      <div>{story.title}</div>
                      <div className="small text-muted">
                        {story.time_required ? (
                          `${story.time_required} points • Business Value: ${story.business_value || 'N/A'} • Priority: ${Object.keys(priorityMapping).find(key => priorityMapping[key] === story.priority) || 'N/A'}`
                        ) : (
                          <span className="text-danger">Story points required to add to sprint</span>
                        )}
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleReset}>
          Reset
        </Button>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={submitting || loading || !startDate || !endDate}
        >
          {submitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
              Creating...
            </>
          ) : (
            'Create Sprint'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddSprintModal;