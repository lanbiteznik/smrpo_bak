"use client";
import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useRouter } from 'next/navigation';

interface DeleteUserButtonProps {
  userId: number;
}

export default function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/person?id=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        router.refresh();
      } else {
        const resBody = await res.json();
        console.error(resBody);
        setErrorModal({ show: true, message: resBody.error });
      }
    } catch (error) {
      console.error(error);
      setErrorModal({ show: true, message: "Error deleting user" });
    } finally {
      setShowModal(false);
    }
  };

  return (
    <>
      <Button variant="danger" onClick={() => setShowModal(true)}>Delete</Button>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this user?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={errorModal.show} onHide={() => setErrorModal({ show: false, message: '' })}>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorModal.message}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setErrorModal({ show: false, message: '' })}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
