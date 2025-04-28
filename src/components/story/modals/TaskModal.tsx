import React, { useEffect, useState } from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { Subtask } from '@/types';
import TimeLogPanel from '../TimeLogPanel';
import { useSession } from 'next-auth/react'; 

interface TaskModalProps {
  show: boolean;
  onHide: () => void;
  onUpdate?: () => void;
  task: Subtask | null;
}

const priorityMap: Record<number, { label: string; variant: string }> = {
  1: { label: "Low", variant: "success" },
  2: { label: "Medium", variant: "warning" },
  3: { label: "High", variant: "danger" },
};

const TaskModal: React.FC<TaskModalProps> = ({ show, onHide, task, onUpdate }) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [timeRequired, setTimeRequired] = useState<number>(task?.time_required ?? 0);
  const [sprintStart, setSprintStart] = useState<string>('');
  const [sprintEnd, setSprintEnd] = useState<string>('');

  useEffect(() => {
    const fetchSprint = async () => {
      if (task?.story_id) {
        try {
          const res = await fetch(`/api/story/${task.story_id}/sprint`);
          const data = await res.json();
          setSprintStart(data.start_date);
          setSprintEnd(data.end_date);
          console.log("Sprint dates:", data.start_date, data.end_date);
        } catch (err) {
          console.error("Failed to fetch sprint info", err);
        }
      }
    };
  
    fetchSprint();
  }, [task?.story_id]);  

  useEffect(() => {
    if (task?.time_required !== undefined) {
      setTimeRequired(task.time_required);
    }
  }, [task?.time_required]);

  if (!task) return null;

  const handleMarkAsDone = async () => {
    if (!task?.id) return;

    try {
      const res = await fetch(`/api/subtask/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finished: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark as done");
      }

      await res.json();
      onHide();
      onUpdate?.();
    } catch (err) {
      console.error("Failed to mark subtask as done:", err);
      alert("Could not mark subtask as done.");
    }
  };

  const canMarkAsDone =
    task.accepted && !task.finished && task.assignee?.toString() === currentUserId?.toString(); // ✅ check all conditions

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{task.description}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Status:</strong> {task.finished ? '✅ Finished' : task.accepted ? '👷 In Progress' : task.assignee ? '👤 Assigned' : 'Unassigned'}</p>
        <p><strong>Estimated Time Required:</strong> {timeRequired} h</p>
        <p><strong>Assignee:</strong> {task.person?.name} {task.person?.lastname}</p>
        <p>
          <strong>Priority:</strong>{" "}
          {task.priority ? (
            <Badge bg={priorityMap[task.priority].variant}>
              {priorityMap[task.priority].label}
            </Badge>
          ) : (
            "Unknown"
          )}
        </p>
        <hr />
        {task.id !== undefined && (
          <TimeLogPanel
            subtaskId={task.id}
            accepted={task.accepted ?? false}
            assignee={task.assignee ?? null}
            finished={task.finished}
            timeRequired={task.time_required ?? 0}
            setTimeRequired={setTimeRequired}
            sprintStart={sprintStart}
            sprintEnd={sprintEnd}
          />
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        {canMarkAsDone && ( // ✅ conditionally show the button
          <Button
            variant="outline-success"
            onClick={handleMarkAsDone}
            className="d-flex align-items-center gap-2"
          >
            <span>✅</span>
            <span>Mark as Done</span>
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TaskModal;
