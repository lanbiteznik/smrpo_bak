import React, { useState, useEffect } from "react";
import { Button, Modal, Form, Alert } from "react-bootstrap";
import Select from "react-select";

interface Person {
  id: number;
  username: string;
  role: number;
}

interface AddProjectButtonProps {
  onProjectAdded: () => void;
}

const AddProjectButton: React.FC<AddProjectButtonProps> = ({ onProjectAdded }) => {
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedProductOwner, setSelectedProductOwner] = useState<string>("");
  const [selectedScrumMaster, setSelectedScrumMaster] = useState<string>("");
  const [selectedDevelopers, setSelectedDevelopers] = useState<{ label: string; value: string }[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showForm) {
      fetchPersons();
    }
  }, [showForm]);

  const fetchPersons = async () => {
    try {
      const response = await fetch("/api/allPersons");
      if (!response.ok) {
        throw new Error("Failed to fetch persons");
      }
      const data = await response.json();
      setPersons(data);
    } catch (error) {
      console.error("Error fetching persons:", error);
      setError("Error loading members.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/project", {
        method: "POST",
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
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      onProjectAdded();
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
    setProjectName("");
    setProjectDescription("");
    setSelectedProductOwner("");
    setSelectedScrumMaster("");
    setSelectedDevelopers([]);
    setValidationError(null);
    setError(null);
  };

  const validPersons = persons.filter((person) => person.role !== 2);
  const validScrumMasters = validPersons.filter((person) => person.username !== selectedProductOwner);
  const validDevelopers = validPersons.filter((person) => person.username !== selectedProductOwner);

  useEffect(() => {
    setSelectedDevelopers((prev) => prev.filter((dev) => dev.value !== selectedProductOwner));
    if (selectedScrumMaster === selectedProductOwner) {
      setSelectedScrumMaster("");
    }
  }, [selectedProductOwner, selectedScrumMaster]);

  return (
    <>
      <Button variant="primary" onClick={() => setShowForm(true)} className="mt-4">
        Add Project
      </Button>

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {validationError && <Alert variant="warning">{validationError}</Alert>}

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

            {/* Product Owner Dropdown */}
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

            {/* Scrum Master Dropdown */}
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

            {/* Developers */}
            <Form.Group className="mb-3">
              <Form.Label>Developers</Form.Label>
              <Select
                isMulti
                options={validDevelopers.map((person) => ({
                  label: person.username,
                  value: person.username,
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
          <Button variant="secondary" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="secondary" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Add Project"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddProjectButton;
