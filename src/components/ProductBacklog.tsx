import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Story as StoryType } from '../types';
import StoryRealizationModal from './story/StoryRealizationModal';
import StoryList from './story/StoryList';
import Story from './story/Story';
import AddStoryButton from './story/AddStoryButton';
import { Sprint } from '@/app/models/models';


interface ProductBacklogProps {
  projectId: number;
  isProductOwner: boolean;
  isScrumMaster?: boolean;
}

const ProductBacklog: React.FC<ProductBacklogProps> = ({ projectId, isProductOwner, isScrumMaster }) => {
  const [stories, setStories] = useState<StoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realisedStories, setRealisedStories] = useState<StoryType[]>([]);
  const [assignedStories, setAssignedStories] = useState<StoryType[]>([]);
  const [unassignedStories, setUnassignedStories] = useState<StoryType[]>([]);
  const hideRejectedStories = false;
  const [showRealizationModal, setShowRealizationModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryType | null>(null);
  const [selectedStoryIds, setSelectedStoryIds] = useState<number[]>([]);
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/stories`);
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }
      const data = await response.json();
  
      const processedData = data.map((story: StoryType) => {
        if (
          !story.sprint_id &&
          (story.rejected === true ||
            story.rejected_description ||
            story.returned_from_sprint)
        ) {
          return {
            ...story,
            rejected: true,
            failed_tests: true,
          };
        }
        return story;
      });
  
      const sortedStories = processedData.sort((a: StoryType, b: StoryType) => {
        if ((b.priority ?? 0) !== (a.priority ?? 0)) {
          return (b.priority ?? 0) - (a.priority ?? 0);
        }
  
        if ((b.business_value ?? 0) !== (a.business_value ?? 0)) {
          return (b.business_value ?? 0) - (a.business_value ?? 0);
        }
  
        return (a.title ?? '').localeCompare(b.title ?? '');
      });
  
      setStories(sortedStories);
  
      setRealisedStories(sortedStories.filter((story: StoryType) => story.finished));
      setAssignedStories(sortedStories.filter((story: StoryType) => !story.finished && story.sprint_id));
      setUnassignedStories(sortedStories.filter((story: StoryType) => !story.finished && !story.sprint_id));
  
      setError(null);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setError('Failed to load stories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    const fetchActiveSprint = async () => {
      try {
        const response = await fetch(`/api/project/${projectId}/sprints`);
        if (!response.ok) throw new Error('Failed to fetch sprints');
        const data = await response.json();
        const activeSprint = data.find((s: Sprint) => s.active);
        setCurrentSprint(activeSprint ?? null);
      } catch (error) {
        console.error('Error fetching sprints:', error);
      }
    };
  
    fetchActiveSprint();
  }, [projectId]);

  // Apply filters
  const filteredRealisedStories = useMemo(() => {
    return realisedStories.filter(story => !hideRejectedStories || !story.rejected);
  }, [realisedStories, hideRejectedStories]);
  
  const filteredAssignedStories = useMemo(() => {
    return assignedStories.filter(story => !hideRejectedStories || !story.rejected);
  }, [assignedStories, hideRejectedStories]);
  
  const filteredUnassignedStories = useMemo(() => {
    return unassignedStories.filter(story => !hideRejectedStories || !story.rejected);
  }, [unassignedStories, hideRejectedStories]);

  const wontHaveStories = useMemo(() => {
    const result = unassignedStories.filter(story => story.priority === 1);
    return result;
  }, [unassignedStories]);
  
  
  const visibleUnassignedStories = useMemo(() => {
    return unassignedStories.filter(story => story.priority !== 1);
  }, [unassignedStories]);

  // Story movement handling
  const handleStoryMove = async (storyId: number, destination: string) => {
    try {
      const story = stories.find(s => s.id === storyId);
      if (!story) {
        setError('Story not found');
        return;
      }
      
      const response = await fetch('/api/story/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: storyId,
          sprint_id: destination === 'unassigned' ? null : story.sprint_id,
          active: destination === 'assigned',
          finished: destination === 'realised',
          project_id: projectId
        }),
      });
      
      if (!response.ok) throw new Error('Failed to move story');
      fetchStories();
    } catch (error) {
      console.error('Error moving story:', error);
      setError('Failed to move story. Please try again.');
    }
  };
  
  // Realization modal functions
  const openRealizationModal = (story: StoryType) => {
    setSelectedStory(story);
    setShowRealizationModal(true);
  };
  
  const handleRealizeStory = async (
    story: StoryType,
    acceptanceTestPassed: boolean,
    comment: string
  ) => {
    const response = await fetch(`/api/story/${story.id}/realize`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acceptanceTestPassed,
        comment,
        realized_at: new Date().toISOString(),
      }),
    });
  
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to realize story');
    }
  
    setShowRealizationModal(false);
    fetchStories();
  };
  

  const renderActionButton = (story: StoryType) => {
    if (!isProductOwner) return null;
  
    const allTasksCompleted =
      Array.isArray(story.subtasks) &&
      story.subtasks.length > 0 &&
      story.subtasks.every((task) => task?.finished === true);
  
    const isAssignedToSprint = !!story.sprint_id;
  
    return (
      <div className="d-flex justify-content-between mt-2 w-100">
        {isAssignedToSprint && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => openRealizationModal(story)}
          >
            Reject
          </Button>
        )}

        {allTasksCompleted && (
          <Button
            variant="success"
            size="sm"
            onClick={async () => {
              await handleRealizeStory(story, true, "Marked as accepted by PO.");
            }}
          >
            Accept
          </Button>
        )}
      </div>
    );
  };
  
  const renderCheckbox = (story: StoryType) => {
    if (!isScrumMaster || !currentSprint) return null;
  
    const isDisabled = !story.time_required || !currentSprint;
  
    const checkbox = (
      <input
        type="checkbox"
        className="form-check-input"
        style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}
        disabled={isDisabled}
        checked={selectedStoryIds.includes(story.id)}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedStoryIds((prev) => [...prev, story.id]);
          } else {
            setSelectedStoryIds((prev) => prev.filter((id) => id !== story.id));
          }
        }}
      />
    );
  
    if (isDisabled) {
      return (
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-disabled-${story.id}`}>
              { !story.time_required
                ? 'Cannot select story without time estimation'
                : 'No active sprint available' }
            </Tooltip>
          }
        >
          <span className="d-inline-block">{checkbox}</span>
        </OverlayTrigger>
      );
    }
  
    return checkbox;
  };
  
  const handleMoveSelectedToSprint = async () => {
    if (!currentSprint) return;
  
    try {
      for (const storyId of selectedStoryIds) {
        await fetch('/api/story/move', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: storyId,
            sprint_id: currentSprint.id,
            active: true,
            finished: false,
            project_id: projectId,
          }),
        });
      }
  
      setSelectedStoryIds([]);
      fetchStories();
    } catch (err) {
      console.error("Error moving stories:", err);
      setError("Failed to move selected stories.");
    }
  };

  // Render loading/error states
  if (loading) return <Spinner animation="border" role="status" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="product-backlog">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Product Backlog</h2>
          {(isScrumMaster || isProductOwner) && (
            <AddStoryButton projectId={projectId} onStoryAdded={fetchStories} />
          )}
      </div>

      <Row>
        <Col md={9}>
          <Card className="mb-4">
            <Card.Header className="bg-danger text-white">
              <h3 className="mb-0">Unfinished Stories</h3>
              <Badge bg="light" text="dark">
                {filteredAssignedStories.length + filteredUnassignedStories.length}
              </Badge>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                <StoryList
                  title="Future Releases"
                  stories={wontHaveStories}
                  badgeColor="light"
                  headerColor="secondary"
                  onUpdate={fetchStories}
                  onMove={handleStoryMove}
                  allowComments={true}
                />
                </Col>

                <Col md={4}>
                  <StoryList
                    title="Unassigned"
                    stories={visibleUnassignedStories}
                    badgeColor="light"
                    headerColor="secondary"
                    onUpdate={fetchStories}
                    onMove={handleStoryMove}
                    renderCheckbox={renderCheckbox}
                    allowComments={true}
                    actionBar={
                      isScrumMaster &&
                      selectedStoryIds.length > 0 &&
                      currentSprint && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleMoveSelectedToSprint}
                        >
                          Move {selectedStoryIds.length} selected to Current Sprint
                        </Button>
                      )
                    }
                  />
                </Col>

                <Col md={4}>
                  <StoryList
                    title="Assigned in current sprint"
                    stories={filteredAssignedStories}
                    badgeColor="light"
                    headerColor="primary"
                    onUpdate={fetchStories}
                    onMove={handleStoryMove}
                    actionButton={renderActionButton}
                    allowComments={false}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="mb-4">
            <Card.Header className="bg-success text-white">
              <h3 className="mb-0">Finished Stories</h3>
              <Badge bg="light" text="dark">{filteredRealisedStories.length}</Badge>
            </Card.Header>
            <Card.Body>
              {filteredRealisedStories.length === 0 ? (
                <p className="text-muted">No realised stories yet</p>
              ) : (
                filteredRealisedStories.map(story => (
                  <div key={story.id}>
                    <Story
                      story={story}
                      onUpdate={fetchStories}
                      onMove={(destination) => handleStoryMove(story.id, destination)}
                    />
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <StoryRealizationModal
        show={showRealizationModal}
        onHide={() => setShowRealizationModal(false)}
        story={selectedStory}
        onRealize={(passed, comment) => {
          if (selectedStory) {
            return handleRealizeStory(selectedStory, passed, comment);
          }
          return Promise.resolve();
        }}
      />
    </div>
  );
};

export default ProductBacklog;