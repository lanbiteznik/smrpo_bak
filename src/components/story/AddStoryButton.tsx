import React, { useState } from 'react';
import { Button, Modal, Form, Alert } from 'react-bootstrap';

interface AddStoryButtonProps {
  projectId: number;
  onStoryAdded: () => void;
}

const AddStoryButton: React.FC<AddStoryButtonProps> = ({ projectId, onStoryAdded }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tests, setTests] = useState("");
  const [priority, setPriority] = useState("must have");
  const [businessValue, setBusinessValue] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const priorityMapping: { [key: string]: number } = {
      "won't have this time": 1,
      "could have": 2,
      "should have": 3,
      "must have": 4,
    };
  
    const priorityInt = priorityMapping[priority];
  
    const storyData = {
      title,
      description,
      tests,
      priority: priorityInt,
      business_value: businessValue,
      project_id: projectId,
    };
  
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyData),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create sprint');
      }
  
      onStoryAdded();
      handleReset();
      setShowForm(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setTests("");
    setPriority("must have");
    setBusinessValue(1);
    setError(null);
  };

  return (
    <>
      <Button variant="primary" onClick={() => setShowForm(true)}>
        Add User Story
      </Button>

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Story</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Acceptance Tests</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={tests}
                onChange={(e) => setTests(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="must have">Must Have</option>
                <option value="should have">Should Have</option>
                <option value="could have">Could Have</option>
                <option value="won't have this time">Won&apos;t Have This Time</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Business Value</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="10"
                value={businessValue}
                onChange={(e) => setBusinessValue(parseInt(e.target.value))}
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
           <Button variant="secondary" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="secondary" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Add User Story"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddStoryButton;
