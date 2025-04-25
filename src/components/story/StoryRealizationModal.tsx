import React, { useState } from 'react';
import { Modal, Badge, Form, Button, Spinner } from 'react-bootstrap';
import { Story as StoryType } from '../../types';

interface StoryRealizationModalProps {
  show: boolean;
  onHide: () => void;
  story: StoryType | null;
  onRealize: (passed: boolean, comment: string) => Promise<void>;
}

const StoryRealizationModal: React.FC<StoryRealizationModalProps> = ({ 
  show, 
  onHide, 
  story, 
  onRealize 
}) => {
  const [acceptanceTestPassed, setAcceptanceTestPassed] = useState(false);
  const [realizationComment, setRealizationComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRealize = async () => {
    if (!story) return;
    
    setSubmitting(true);
    try {
      await onRealize(acceptanceTestPassed, realizationComment);
      resetForm();
    } catch (error) {
      console.error('Error in story realization:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAcceptanceTestPassed(false);
    setRealizationComment('');
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Review Story Acceptance Tests</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {story && (
          <div>
            <h5>{story.title}</h5>
            
            <div className="mb-3">
              <Badge bg="primary" className="me-2">
                {story.time_required || 0} points
              </Badge>
              <Badge bg="info">
                {story.business_value ? `Business Value: ${story.business_value}` : 'No business value set'}
              </Badge>
            </div>
            
            {story.description && (
              <div className="mb-3">
                <h6>Description:</h6>
                <p className="whitespace-pre-wrap">{story.description}</p>
              </div>
            )}
            
            {story.tests && (
              <div className="mb-3">
                <h6>Acceptance Tests:</h6>
                <pre className="p-2 bg-light border rounded">{story.tests}</pre>
              </div>
            )}
            
            <hr />
          
            <Form.Group className="mb-3">
              <Form.Label>Comment (required)</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder={
                  acceptanceTestPassed 
                    ? "Add comments about the implemented story..." 
                    : "Explain why the story failed the acceptance tests..."
                }
                value={realizationComment}
                onChange={(e) => setRealizationComment(e.target.value)}
                required
              />
            </Form.Group>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant={acceptanceTestPassed ? "success" : "danger"}
          onClick={handleRealize}
          disabled={submitting || !realizationComment.trim()}
        >
          {submitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Processing...
            </>
          ) : acceptanceTestPassed ? (
            "Mark as Realized"
          ) : (
            "Return to Backlog"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StoryRealizationModal;