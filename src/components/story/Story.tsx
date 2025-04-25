import React, { useState, useEffect } from 'react';
import { Card, Badge } from 'react-bootstrap';
import StoryModal from './StoryModal';
import { Story as StoryType } from '@/types';

// Define interfaces that match what's coming from the API
import { Subtask } from '@/types';

export interface Developer {
  id: number;
  name: string;
  lastname?: string;
  email?: string;
}

export interface Comment {
  id?: number;
  content: string;
  created_at?: Date;
  updated_at?: Date;
  story_id?: number;
  author_id?: number;
  author?: {
    name?: string;
    lastname?: string;
    id?: number;
  };
}

export interface StoryProps {
  renderCheckbox?: (story: StoryType) => React.ReactNode;
  actionButton?: React.ReactNode;
  story: {
    id: number;
    title?: string;
    description?: string;
    time_required?: number;
    business_value?: number;
    priority?: number;
    project_id?: number;
    sprint_id?: number;
    active?: boolean;
    finished?: boolean;
    subtasks?: Subtask[];
    tests?: string; // Add tests field to the StoryProps interface
    rejected?: boolean;
    rejected_description?: string;
    rejected_time_required?: number;
  };
  onUpdate: () => void;
  onMove?: (destination: string) => void;
  allowComments?: boolean;
}

const Story: React.FC<StoryProps> = ({ 
  story, 
  onUpdate, 
  onMove, 
  renderCheckbox, 
  actionButton,
  allowComments = false 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [sprintInfo, setSprintInfo] = useState<{ name?: string; start_date?: string; end_date?: string } | null>(null);
  // Fix the Scrum Master role check - it should check if role === 1

  // Determine priority label and variant for badge
  let priorityLabel = '';
  let priorityVariant = '';
  
  switch (story.priority) {
    case 1:
      priorityLabel = "Won't Have This Time";
      priorityVariant = 'secondary';
      break;
    case 2:
      priorityLabel = 'Could Have';
      priorityVariant = 'info';
      break;
    case 3:
      priorityLabel = 'Should Have';
      priorityVariant = 'warning';
      break;
    case 4:
      priorityLabel = 'Must Have';
      priorityVariant = 'danger';
      break;
    default:
      priorityLabel = 'Unknown';
      priorityVariant = 'light';
  }

  useEffect(() => {
    const fetchSprint = async () => {
      if (story.sprint_id && story.finished) {
        try {
          const res = await fetch(`/api/sprint/${story.sprint_id}`);
          if (!res.ok) throw new Error("Failed to fetch sprint data");
          const data = await res.json();
          setSprintInfo({
            name: data.title,
            start_date: data.start_date,
            end_date: data.finish_date,
          });
        } catch (err) {
          console.error("Error fetching sprint info:", err);
        }
      }
    };
  
    fetchSprint();
  }, [story.sprint_id, story.finished]);

  // Handle double click to open the modal
  const handleDoubleClick = () => {
    setShowModal(true);
  };

  // Get the task completion percentage
  const getCompletionPercentage = () => {
    if (!story.subtasks || story.subtasks.length === 0) {
      return 0;
    }
    const completedTasks = story.subtasks.filter(task => task.finished).length;
    return Math.round((completedTasks / story.subtasks.length) * 100);
  };

  const completionPercentage = getCompletionPercentage();
  
  return (
    <>
      <Card 
        className="mb-3 story-card" 
        onDoubleClick={handleDoubleClick}
        style={{ cursor: 'pointer' }}
      >
        <Card.Body>
          <Card.Title>
            <div className="d-flex align-items-center">
              {renderCheckbox && (
                <div className="me-2">{renderCheckbox(story)}</div>
              )}
              <span>{story.title}</span>
            </div>
          </Card.Title>

          {story.finished && sprintInfo && (
            <div className="text-muted small mb-2">
              <strong>Completed in sprint:</strong> {sprintInfo.name || 'Unnamed Sprint'}
              <br />
              <strong>Dates:</strong>{' '}
              {sprintInfo.start_date ? new Date(sprintInfo.start_date).toLocaleDateString() : 'N/A'}
              {' – '}
              {sprintInfo.end_date ? new Date(sprintInfo.end_date).toLocaleDateString() : 'N/A'}
            </div>
          )}

          <div className="mb-2">
            <Badge bg={priorityVariant} className="me-2">{priorityLabel}</Badge>
            {story.time_required && (
              <Badge bg="primary" className="me-2">{story.time_required} points</Badge>
            )}
            {story.business_value && (
              <Badge bg="success">Value: {story.business_value}</Badge>
            )}
          </div>
          
          {story.description && (
            <Card.Text className="story-description whitespace-pre-wrap">
              <strong>Description:</strong>{`\n`}
              {story.description.length > 100
                ? `${story.description.substring(0, 100)}...`
                : story.description}
            </Card.Text>
          )}

          {story.tests && (
            <>
              <strong>Acceptance Tests:</strong>
              <Card.Text className="story-tests whitespace-pre-wrap">
                {story.tests
                  .split(/\r?\n/)
                  .filter(line => line.trim() !== '')
                  .map((line) => `# ${line.trim()}`)
                  .join('\n')
                }
              </Card.Text>
            </>
          )}
          
          {story.subtasks && story.subtasks.length > 0 && (
            <div className="mt-2 small">
              <div className="d-flex justify-content-between">
                <span>Tasks: {story.subtasks.filter(task => task.finished).length}/{story.subtasks.length}</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ width: `${completionPercentage}%` }} 
                  aria-valuenow={completionPercentage} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          )}

          {story.rejected && (
            <div className="mt-2">
              <Badge bg="danger" className="story-rejected-badge">
                Returned from sprint
              </Badge>
              {story.rejected_description && (
                <div className="small text-muted mt-1">
                  Reason: {story.rejected_description}
                </div>
              )}
              {story.rejected_time_required && (
                <div className="small text-muted">
                  Original estimate: {story.rejected_time_required} points
                </div>
              )}
            </div>
          )}
          {actionButton && (
            <div className="mt-3 d-flex">
              {actionButton}
            </div>
          )}
        </Card.Body>
        
        {story.active && (
          <div className="story-active-indicator"></div>
        )}
        
        {story.finished && (
          <div className="story-finished-indicator"></div>
        )}
      </Card>

      {/* REMOVED: The Tabs component that was showing outside the modal */}

      <StoryModal 
        show={showModal}
        onHide={() => setShowModal(false)}
        story={story}
        onUpdate={onUpdate}
        onMove={onMove}
        allowComments={allowComments}
      />
    </>
  );
};

export default Story;