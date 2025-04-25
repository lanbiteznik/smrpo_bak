import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";
import Select from "react-select";

interface Person {
  id: number;
  username: string;
  role: number;
}

interface Project {
  id: number;
  title: string;
  description: string;
  users: string;
}

interface EditProjectModalProps {
  show: boolean;
  onHide: () => void;
  project: Project;
  onProjectEdited: (updated: Project) => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  show,
  onHide,
  project,
  onProjectEdited,
}) => {
  const [projectName, setProjectName] = useState(project.title);
  const [projectDescription, setProjectDescription] = useState(project.description || "");
  const [selectedProductOwner, setSelectedProductOwner] = useState<string>("");
  const [selectedScrumMaster, setSelectedScrumMaster] = useState<string>("");
  const [selectedDevelopers, setSelectedDevelopers] = useState<{ label: string; value: string }[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const [po, sm, devs] = project.users.split("|").map(s => s.trim());
    setSelectedProductOwner(po?.replace("Product Owner: ", "") || "");
    setSelectedScrumMaster(sm?.replace("Scrum Master: ", "") || "");
    const devList = devs?.replace("Developers: ", "").split(", ").filter(Boolean) || [];
    setSelectedDevelopers(devList.map(name => ({ label: name, value: name })));
  }, [project]);

  useEffect(() => {
    if (!show) return;
    const fetchPersons = async () => {
      try {
        const res = await fetch("/api/allPersons");
        const data = await res.json();
        setPersons(data);
      } catch {
        setError("Failed to load people.");
      }
    };
    fetchPersons();
  }, [show]);

  // Remove Product Owner from developers
  useEffect(() => {
    setSelectedDevelopers((prev) =>
      prev.filter((dev) => dev.value !== selectedProductOwner)
    );
    setSelectedScrumMaster((prevSM) =>
      prevSM === selectedProductOwner ? "" : prevSM
    );
  }, [selectedProductOwner]);

  const validPersons = persons.filter((p) => p.role !== 2);
  const validScrumMasters = validPersons.filter((p) => p.username !== selectedProductOwner);
  const validDevelopers = validPersons.filter((p) => p.username !== selectedProductOwner);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/project/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectName,
          description: projectDescription,
          selectedProductOwner,
          selectedScrumMaster,
          selectedDevelopers: selectedDevelopers.map((dev) => dev.value),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update project");
      }
      const updated = await response.json();

      if (updated.message === "No changes detected") {
        onHide();
        return;
      }

      onProjectEdited(updated);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    }finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Project Name</Form.Label>
            <Form.Control
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Product Owner</Form.Label>
            <Form.Select
              value={selectedProductOwner}
              onChange={(e) => setSelectedProductOwner(e.target.value)}
              required
            >
              <option value="">Select Product Owner</option>
              {validPersons.map((person) => (
                <option key={person.id} value={person.username}>
                  {person.username}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Scrum Master</Form.Label>
            <Form.Select
              value={selectedScrumMaster}
              onChange={(e) => setSelectedScrumMaster(e.target.value)}
              required
            >
              <option value="">Select Scrum Master</option>
              {validScrumMasters.map((person) => (
                <option key={person.id} value={person.username}>
                  {person.username}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Developers</Form.Label>
            <Select
              isMulti
              options={validDevelopers.map((p) => ({
                label: p.username,
                value: p.username,
              }))}
              value={selectedDevelopers}
              onChange={(selected) =>
                setSelectedDevelopers(selected as { label: string; value: string }[])
              }
              className="w-full"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditProjectModal;