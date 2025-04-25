"use client";
import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import EditSprintModal from './EditSprintModal';

interface Sprint {
    id: number;
    title: string;
    start_date: string;
    finish_date: string;
    velocity: number;
    project_id: number;
    active: boolean | null;
  }
  
  interface EditSprintButtonProps {
    sprint: Sprint;
    projectId: number;
    onSprintUpdated: () => void;
  }

const EditSprintButton: React.FC<EditSprintButtonProps> = ({ sprint, projectId, onSprintUpdated }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button 
        variant="outline-secondary"
        size="sm"
        onClick={() => setShowModal(true)}
        className="me-2"
      >
        Edit Sprint
      </Button>

      <EditSprintModal 
        show={showModal}
        sprint={sprint}
        projectId={projectId}
        onHide={() => setShowModal(false)}
        onSuccess={onSprintUpdated}
        />
    </>
  );
};

export default EditSprintButton;