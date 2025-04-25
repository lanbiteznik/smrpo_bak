import React from 'react';
import { Card, Badge } from 'react-bootstrap';

// Use a more flexible type definition that accepts optional fields
interface StoryCardProps {
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
    subtasks?: Array<{
      id: number;
      description?: string;
      finished?: boolean;
    }>;
  };
}

const StoryCard: React.FC<StoryCardProps> = ({ story }) => {
  return (
    <Card className="mb-2">
      <Card.Body>
        <Card.Title>{story.title}</Card.Title>
        <div className="d-flex gap-2 mb-2">
          {story.business_value && (
            <Badge bg="danger">Must Have</Badge>
          )}
          {story.time_required && (
            <Badge bg="success">{story.time_required} points</Badge>
          )}
        </div>
        <Card.Text>{story.description}</Card.Text>
        
        {/* Display subtasks if available */}
        {story.subtasks && story.subtasks.length > 0 && (
          <div className="mt-2">
            <small className="text-muted">Tasks:</small>
            <ul className="list-unstyled mt-1">
              {story.subtasks.map(task => (
                <li key={task.id} className="border-start ps-2 mb-1">
                  <small>{task.description}</small>
                  {task.finished && <Badge bg="success" className="ms-1">Done</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default StoryCard; 