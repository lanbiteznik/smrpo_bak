"use client";
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";

interface Sprint {
  id: number;
  title: string;
  start_date: string;
  finish_date: string;
  velocity: number | null;
  project_id: number;
  active: boolean | null;
}

interface EditSprintModalProps {
  show: boolean;
  onHide: () => void;
  sprint: Sprint;
  projectId: number;
  onSuccess: () => void;
}

const EditSprintModal: React.FC<EditSprintModalProps> = ({ show, onHide, sprint, projectId, onSuccess, }) => {
    const [startDate, setStartDate] = useState(sprint.start_date);
    const [endDate, setEndDate] = useState(sprint.finish_date);
    const [velocity, setVelocity] = useState(sprint.velocity?.toString() || "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalPoints, setTotalPoints] = useState<number>(0);

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Fetch available stories when modal is shown
    useEffect(() => {
        if (!show || !sprint.id) return;
      
        const fetchStories = async () => {
          try {
            const response = await fetch(`/api/sprint/${sprint.id}/stories`);
            if (!response.ok) throw new Error("Failed to fetch stories");
      
            const data = await response.json();
      
            interface SprintStory {
              id: number;
              title?: string;
              time_required?: number | null;
            }
      
            const storyList = data.map((story: SprintStory) => ({
              id: story.id,
              title: story.title,
              time_required: story.time_required,
            }));
      
            const total = storyList.reduce((sum: number, story: SprintStory) => {
              return sum + (story.time_required || 0);
            }, 0);
            setTotalPoints(total);
            console.log("Total story points in this sprint:", total);
          } catch (err) {
            console.error("Error fetching stories:", err);
          } finally {
          }
        };
      
    fetchStories();
    }, [show, sprint.id]);
      
    useEffect(() => {
      if (show) {
        setStartDate(formatDate(sprint.start_date));
        setEndDate(formatDate(sprint.finish_date));
        setVelocity(sprint.velocity?.toString() || "");
      }
    }, [show, sprint]);
      
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

    try {
      const response = await fetch(`/api/sprint/${sprint.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          finish_date: endDate,
          velocity: velocity ? parseInt(velocity) : null,
          project_id: projectId,
          minPoints: totalPoints,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update sprint");
      }

      onSuccess();
      onHide();
    } catch (err) {
      console.error("Update error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Sprint</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>

        { !sprint.active && (
          <>
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
          </>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Velocity (Optional - defaults to total story points)</Form.Label>
          <Form.Control
              type="number"
              value={velocity}
              onChange={(e) => setVelocity(e.target.value)}
              required
          />
          <Form.Text className="text-muted">
              Total points of current sprint stories: {totalPoints}
          </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                className="me-2"
              />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditSprintModal;