"use client";
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProjectDocumentationModalProps {
  show: boolean;
  onHide: () => void;
  projectId: number;
}

const ProjectDocumentationModal: React.FC<ProjectDocumentationModalProps> = ({ show, onHide, projectId }) => {
  const [markdown, setMarkdown] = useState("");
  const [initialMarkdown, setInitialMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const fetchDocs = async () => {
      try {
        const res = await fetch(`/api/project/${projectId}/docs`);
        const data = await res.json();
        setMarkdown(data.text || "");
        setInitialMarkdown(data.text || "");
      } catch {
        setError("Failed to load documentation.");
      }
    };
    fetchDocs();
  }, [show, projectId]);

  const handleSave = async () => {
    if (markdown.trim() === "") {
      setError("Documentation cannot be empty.");
      return;
    }
    if (markdown === initialMarkdown) {
      setError("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/project/${projectId}/docs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: markdown }),
      });
      console.log("Sending docs:", markdown);


      if (!res.ok) throw new Error("Failed to save documentation");

      setInitialMarkdown(markdown);
      setError(null);
      onHide();
    } catch (err) {
      setError("Error saving documentation.: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project_documentation.md";
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setMarkdown(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      fullscreen="lg-down"
      dialogClassName="modal-90w"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Project Documentation</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "80vh", overflowY: "auto" }}>
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="d-flex flex-row gap-4" style={{ height: "60vh" }}>
          {/* Left: Markdown editor */}
          <div className="flex-fill w-50">
            <Form.Control
              as="textarea"
              rows={20}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Write documentation in Markdown..."
              style={{ height: "100%", resize: "none" }}
            />
          </div>

          {/* Right: Markdown preview */}
          <div className="flex-fill w-50 border rounded p-3 bg-light overflow-auto">
            <h5 className="text-muted mb-2">Preview</h5>
            <article className="markdown-body" style={{ maxHeight: "100%", overflowY: "auto" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
                </ReactMarkdown>
            </article>
            </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
            <Button variant="outline-secondary" onClick={handleExport}>
                Export
            </Button>
            <div>
                <input
                type="file"
                id="import-markdown"
                accept=".md,.txt"
                onChange={handleImport}
                style={{ display: "none" }}
                />
                <Button
                variant="outline-secondary"
                onClick={() => document.getElementById("import-markdown")?.click()}
                >
                Import
                </Button>
            </div>
        </div>
        <div className="d-flex ms-auto gap-2">
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || markdown.trim() === ""}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ProjectDocumentationModal;
