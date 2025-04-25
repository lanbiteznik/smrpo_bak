import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Story as StoryType } from '../../types';
import Story from './Story';

interface StoryListProps {
  title: string;
  stories: StoryType[];
  badgeColor: string;
  headerColor: string;
  onUpdate: () => void;
  onMove: (storyId: number, destination: string) => void;
  actionButton?: (story: StoryType) => React.ReactNode;
  renderCheckbox?: (story: StoryType) => React.ReactNode;
  wontHaveStories?: StoryType[]; 
  showWontHave?: boolean;        
  toggleWontHave?: () => void;   
  children?: React.ReactNode;
  actionBar?: React.ReactNode;
  allowComments?: boolean;
}

const StoryList: React.FC<StoryListProps> = ({
  title,
  stories,
  badgeColor,
  headerColor,
  onUpdate,
  onMove,
  actionButton,
  renderCheckbox,
  wontHaveStories = [],
  showWontHave = false,
  toggleWontHave,
  children,
  actionBar,
  allowComments = false
}) => {
  return (
    <Card className="mb-3">
      <Card.Header className={`bg-${headerColor} text-white`}>
        <h4>{title}</h4>
        <Badge bg={badgeColor} text="dark">{stories.length + wontHaveStories.length}</Badge>
      </Card.Header>
      {actionBar && (
        <div className="d-flex justify-content-center mt-3 mb-4">
          <div className="text-center">
            {actionBar}
          </div>
        </div>
      )}
      <Card.Body>
        {stories.length === 0 && wontHaveStories.length === 0 ? (
          <p className="text-muted">No {title.toLowerCase()}</p>
        ) : (
          <>
            {stories.map(story => (
              <div key={story.id}>
                <Story
                  story={story}
                  onUpdate={onUpdate}
                  onMove={(destination) => onMove(story.id, destination)}
                  renderCheckbox={renderCheckbox}
                  actionButton={actionButton ? actionButton(story) : null}
                  allowComments={allowComments}
                />
              </div>
            ))}

            {wontHaveStories.length > 0 && (
              <>
                <div
                  className="wont-have-divider text-center mt-4 mb-2"
                  role="button"
                  onClick={toggleWontHave}
                  aria-expanded={showWontHave}
                >
                  <span className="wont-have-toggle-pill">
                  Won&#39;t Have This Time ({wontHaveStories.length}){' '}
                    <i className={`bi ${showWontHave ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                  </span>
                </div>

                <div
                  className={`collapse-content ${showWontHave ? 'show' : ''}`}
                  style={{ transition: 'max-height 0.3s ease', overflow: 'hidden' }}
                >
                  {showWontHave && wontHaveStories.map(story => (
                    <div key={story.id} className="mb-3">
                      <Story
                        story={story}
                        onUpdate={onUpdate}
                        onMove={(destination) => onMove(story.id, destination)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {children && <div className="mt-3">{children}</div>}
      </Card.Body>
    </Card>
  );
};

export default StoryList;
