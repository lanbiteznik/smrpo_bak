// src/components/SprintCompletionModal.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { Story } from '@/app/models/models';

interface SprintCompletionModalProps {
  show: boolean;
  onHide: () => void;
  sprintId: number;
  sprintTitle: string;
  onComplete: () => void;
}

const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({ 
  show, 
  onHide, 
  sprintId, 
  sprintTitle, 
  onComplete 
}) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStories, setSelectedStories] = useState<number[]>([]);
  const [storyComments, setStoryComments] = useState<{[key: number]: string}>({});
  const [storyRejectionReasons, setStoryRejectionReasons] = useState<{[key: number]: string}>({});

  // Fetch the stories in this sprint
  useEffect(() => {
    if (!show) return;
    
    const fetchSprintStories = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/sprint/${sprintId}/stories`);
        if (!response.ok) {
          throw new Error('Failed to fetch sprint stories');
        }
        
        const data = await response.json();
        
        // Filter to only include incomplete or failed stories
        const incompleteStories = data.filter((story: Story) => 
          !story.finished || story.rejected
        );
        
        setStories(incompleteStories);
        
        // Initialize comments for each story
        const initialComments: {[key: number]: string} = {};
        const initialReasons: {[key: number]: string} = {};
        
        incompleteStories.forEach((story: Story) => {
          initialComments[story.id] = '';
          initialReasons[story.id] = 'incomplete'; // Default reason
        });
        
        setStoryComments(initialComments);
        setStoryRejectionReasons(initialReasons);
      } catch (err) {
        console.error('Error fetching sprint stories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stories');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSprintStories();
  }, [show, sprintId]);

  const handleStorySelection = (storyId: number) => {
    setSelectedStories(prev => {
      if (prev.includes(storyId)) {
        return prev.filter(id => id !== storyId);
      } else {
        return [...prev, storyId];
      }
    });
  };

  const handleCommentChange = (storyId: number, comment: string) => {
    setStoryComments(prev => ({
      ...prev,
      [storyId]: comment
    }));
  };

  const handleReasonChange = (storyId: number, reason: string) => {
    setStoryRejectionReasons(prev => ({
      ...prev,
      [storyId]: reason
    }));
  };
  
  const handleSubmit = async () => {
    if (selectedStories.length === 0) {
      setError('Please select at least one story to return to the backlog');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      // Create an array of story objects with their comments and rejection reasons
      const storiesToReturn = selectedStories.map(storyId => ({
        id: storyId,
        comment: storyComments[storyId],
        rejectionReason: storyRejectionReasons[storyId]
      }));
      
      const response = await fetch(`/api/sprint/${sprintId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stories: storiesToReturn,
          markComplete: false
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete sprint');
      }
      
      // Call the onComplete callback
      onComplete();
      onHide();
    } catch (err) {
      console.error('Error completing sprint:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Handle Failed Stories for {sprintTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}       
        <p>
           Select failed stories to return to the Product Backlog.
        </p>    
        {loading ? (
          <div className="text-center my-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <Alert variant="success">
            All stories in this sprint have been completed successfully!
          </Alert>
        ) : (
          <>
            <ListGroup className="mb-3">
              {stories.map(story => (
                <ListGroup.Item key={story.id}>
                  <Form.Check 
                    type="checkbox"
                    id={`story-${story.id}`}
                    checked={selectedStories.includes(story.id)}
                    onChange={() => handleStorySelection(story.id)}
                    label={
                      <div>
                        <div className="d-flex justify-content-between">
                          <strong>{story.title}</strong>
                        </div>
                        <div className="whitespace-pre-wrap text-muted small">
                          {story.description?.substring(0, 100)}{story.description && story.description.length > 100 ? '...' : ''}
                        </div>
                      </div>
                    }
                    className="mb-2"
                  />
                  
                  {selectedStories.includes(story.id) && (
                    <div className="ms-4 mt-2">
                      <Form.Group className="mb-2">
                        <Form.Label>Reason</Form.Label>
                        <Form.Select 
                          value={storyRejectionReasons[story.id]} 
                          onChange={(e) => handleReasonChange(story.id, e.target.value)}
                        >
                          <option value="incomplete">Incomplete</option>
                          <option value="failed_tests">Failed Acceptance Tests</option>
                          <option value="scope_change">Scope Changed</option>
                          <option value="technical_issues">Technical Issues</option>
                          <option value="other">Other</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group>
                        <Form.Label>Comment</Form.Label>
                        <Form.Control 
                          as="textarea" 
                          rows={2} 
                          placeholder="Explain why this story is being returned to the backlog"
                          value={storyComments[story.id]}
                          onChange={(e) => handleCommentChange(story.id, e.target.value)}
                        />
                      </Form.Group>
                    </div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={submitting || (stories.length > 0 && selectedStories.length === 0)}
        >
          {submitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
              Completing...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SprintCompletionModal;