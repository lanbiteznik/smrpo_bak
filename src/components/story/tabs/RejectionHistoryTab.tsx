import React from 'react';
import { Alert } from 'react-bootstrap';
import { StoryProps } from '../Story';

interface RejectionHistoryTabProps {
  story: StoryProps['story'];
}

const RejectionHistoryTab: React.FC<RejectionHistoryTabProps> = ({ story }) => {
  return (
    <Alert variant="warning">
      <p><strong>This story was returned from a sprint</strong></p>
      {story.rejected_description && (
        <div className="mb-2">
          <strong>Comment:</strong>
          <p className="mb-0">{story.rejected_description}</p>
        </div>
      )}
      {story.rejected_time_required && (
        <p className="mb-0">Original estimate: {story.rejected_time_required} points</p>
      )}
    </Alert>
  );
};

export default RejectionHistoryTab;
