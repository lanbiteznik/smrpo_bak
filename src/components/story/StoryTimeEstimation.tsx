import React, { useState } from 'react';
import { Button, Form, Modal, Alert } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

interface StoryTimeEstimationProps {
  storyId: number;
  currentEstimation: number | null;
  isInSprint: boolean;
  onEstimationUpdated: () => void;
}

const StoryTimeEstimation: React.FC<StoryTimeEstimationProps> = ({
  storyId,
  currentEstimation,
  isInSprint,
  onEstimationUpdated
}) => {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [timeEstimation, setTimeEstimation] = useState<number>(currentEstimation || 0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Check if user is a Methodology Administrator (role 2 based on your schema)
  const isMethodologyAdmin = session?.user?.role === 2;
  
  const handleClose = () => {
    setShowModal(false);
    setError(null);
  };
  
  const handleShow = () => {
    if (isInSprint) {
      setError("Cannot modify time estimation for stories already assigned to a Sprint");
      return;
    }
    setShowModal(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate time estimation
      if (timeEstimation <= 0 || timeEstimation > 100) {
        setError("Time estimation must be a positive number between 1 and 100");
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/story/estimation', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          timeEstimation
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update time estimation');
      }
      
      // Success
      handleClose();
      onEstimationUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isMethodologyAdmin) {
    return (
      <div className="time-estimation">
        <span>Time Estimation: {currentEstimation || 'Not set'}</span>
      </div>
    );
  }
  
  return (
    <>
      <div className="time-estimation d-flex align-items-center">
        <span className="me-2">Time Estimation: {currentEstimation || 'Not set'}</span>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={handleShow}
          disabled={isInSprint}
          title={isInSprint ? "Cannot modify stories assigned to a Sprint" : "Update time estimation"}
        >
          {currentEstimation ? 'Update' : 'Set'} Estimation
        </Button>
      </div>
      
      {error && !showModal && <Alert variant="danger" className="mt-2">{error}</Alert>}
      
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Update Time Estimation</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Time Estimation (hours)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={timeEstimation}
                onChange={(e) => setTimeEstimation(parseFloat(e.target.value))}
                required
              />
              <Form.Text className="text-muted">
                Enter a realistic time estimation between 1 and 100 hours.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default StoryTimeEstimation; 