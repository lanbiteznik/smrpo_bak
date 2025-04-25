"use client";
import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import AddSprintModal from './AddSprintModal';

interface AddSprintButtonProps {
  projectId: number;
  onSprintAdded: () => void;
}

const AddSprintButton: React.FC<AddSprintButtonProps> = ({ projectId, onSprintAdded }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button 
        variant="primary"
        onClick={() => setShowModal(true)}
        className="mb-3"
      >
        Create New Sprint
      </Button>
      
      <AddSprintModal 
        show={showModal}
        projectId={projectId}
        onHide={() => setShowModal(false)}
        onSuccess={onSprintAdded}
      />
    </>
  );
};

export default AddSprintButton;