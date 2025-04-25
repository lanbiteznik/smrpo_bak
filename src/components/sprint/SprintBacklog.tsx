import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Alert, Badge } from 'react-bootstrap';
import { Story as StoryType, Subtask } from '../../types';
import StoryModal from '../story/StoryModal'; 
import TaskModal from '../story/modals/TaskModal'; 
import { useSession } from "next-auth/react";

interface ProductBacklogProps {
  projectId: number;
}

const columns = ['Unassigned', 'Assigned', 'In Progress', 'Done'] as const;

const columnStyles: Record<string, string> = {
  Unassigned: 'bg-light border-end',
  Assigned: 'bg-light border-end',
  'In Progress': 'bg-light border-end',
  Done: 'bg-light',
};

const ProductBacklog: React.FC<ProductBacklogProps> = ({ projectId }) => {
  const [stories, setStories] = useState<StoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Subtask | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryType | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const handleOpenModal = (story: StoryType) => {
    setSelectedStory(story);
    setShowModal(true);
  };

  const handleTaskClick = (task: Subtask) => {
    setSelectedTask(task);
    setShowSubtaskModal(true);
  };

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  console.log('Current User ID:', currentUserId);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/stories`);
      if (!response.ok) throw new Error('Failed to fetch stories');
      const data = await response.json();
      setStories(data.filter((story: StoryType) => !story.finished && story.sprint_id));
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const getSubtasksByStatus = (subtasks: Subtask[] = []) => {
    return {
      Unassigned: subtasks.filter(t => !t.assignee),
      Assigned: subtasks.filter(t => t.assignee && !t.finished && !t.accepted),
      'In Progress': subtasks.filter(t => t.accepted && !t.finished),
      Done: subtasks.filter(t => t.finished),
    };
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="sprint-backlog">
      <h2 className="mb-4">Sprint Backlog</h2>

      <div className="d-flex justify-content-end mb-3">
        <button
          className={`btn btn-sm ${showOnlyMine ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setShowOnlyMine(!showOnlyMine)}
        >
          {showOnlyMine ? 'Show All Tasks' : 'Show Only My Tasks'}
        </button>
      </div>

      <div
        className="row-grid sticky-top text-white fw-semibold"
        style={{
          top: 0,
          zIndex: 100,
          background: 'white',
        }}
      >

        {columns.map((col) => {
          const count = stories
            .map((story) => getSubtasksByStatus(story.subtasks)[col]?.length || 0)
            .reduce((a, b) => a + b, 0);
  
          const bg =
            col === 'Unassigned'
              ? '#6c757d'
              : col === 'Assigned'
              ? '#0d6efd'
              : col === 'In Progress'
              ? '#0dcaf0'
              : col === 'Done'
              ? '#198754'
              : '#343a40';
  
          return (
            <div
              key={col}
              className="flex-fill d-flex justify-content-between align-items-center"
              style={{
                backgroundColor: bg,
                padding: '1.25rem 1rem',
                borderRadius: '0.5rem',
                minHeight: '100px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h4 className="mb-0">{col}</h4>
              <Badge
                bg="light"
                text="dark"
                pill
                style={{ fontSize: '1rem', padding: '0.4em 0.7em' }}
              >
                {count}
              </Badge>
            </div>
          );
        })}
      </div>

      {stories.map(story => {
        const subtasksByStatus = getSubtasksByStatus(story.subtasks);

        return (
          <React.Fragment key={story.id}>
            <div
              className="w-100 py-3 px-3 bg-white border-bottom"
              style={{ cursor: 'pointer' }}
              onClick={() => handleOpenModal(story)}
            >
              <h5 className="mb-0 d-flex align-items-center">
                <span className="me-2">📘 {story.title}</span>

                <Badge bg="danger">
                  {story.priority === 4 ? 'Must Have' :
                  story.priority === 3 ? 'Should Have' :
                  story.priority === 2 ? 'Could Have' : "Won't Have"}
                </Badge>
              </h5>
            </div>

            <div className="row-grid border-bottom py-5 bg-light-subtle">
              {columns.map((col) => (
                <div
                  key={col}
                  className={`flex-fill px-2 ${columnStyles[col]}`}
                  style={{ minHeight: '80px' }}
                >
                  {subtasksByStatus[col as keyof typeof subtasksByStatus].length === 0 ? (
                    <div className="text-muted small">No tasks</div>
                  ) : (
                    subtasksByStatus[col]
                    .filter(task => !showOnlyMine || task.assignee == currentUserId)
                    .map((task, idx) => {
                      const isMine = task.assignee == currentUserId;
                      return (
                        <div
                          key={idx}
                          className={`mb-3 p-3 rounded shadow-sm border ${
                            isMine ? 'border-primary bg-light' : 'bg-white'
                          }`}
                          style={{
                            cursor: 'pointer',
                            transition: '0.2s ease-in-out',
                          }}
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong className="text-dark">{task.description}</strong>
                            {isMine && <Badge bg="primary" pill>My Task</Badge>}
                          </div>
                          <div className="d-flex justify-content-between text-muted small">
                            <div>
                              {task.person?.name ? `👤 ${task.person.username}` : 'Unassigned'}
                            </div>
                            <div>
                              ⏱ {task.time_required ?? 'N/A'} h
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </React.Fragment>
        );
      })}

      {selectedStory && (
        <StoryModal
          show={showModal}
          onHide={() => setShowModal(false)}
          story={selectedStory}
          onUpdate={fetchStories}
        />
      )}

      <TaskModal show={showSubtaskModal} onHide={() => setShowSubtaskModal(false)} task={selectedTask} onUpdate={fetchStories} />

    </div>
  );
};

export default ProductBacklog;
