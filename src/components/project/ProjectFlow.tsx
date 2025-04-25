import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import Story from '../story/Story';
import AddStoryButton from '../story/AddStoryButton';
import { Story as StoryType } from '@/app/models/models';
import { useSession } from "next-auth/react";

interface ProjectFlowProps {
  projectId: number;
}

interface Project {
  id: number;
  users: string;
}

const ProjectFlow: React.FC<ProjectFlowProps> = ({ projectId }) => {
  const [stories, setStories] = useState<StoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sprints, setSprints] = useState<{ id: number; title: string }[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const { data: session } = useSession();
  const [isAllowed, setIsAllowed] = useState(false);
  
  // Organize stories by status
  const [productBacklog, setProductBacklog] = useState<StoryType[]>([]);
  const [sprintBacklog, setSprintBacklog] = useState<StoryType[]>([]);
  const [inProgress, setInProgress] = useState<StoryType[]>([]);
  const [inReview, setInReview] = useState<StoryType[]>([]);
  const [done, setDone] = useState<StoryType[]>([]);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/stories`);
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }
      const data = await response.json();
      setStories(data);
      
      // Categorize stories - ensure each story appears in only one column
      // First, separate stories that are finished
      const finishedStories = data.filter((story: StoryType) => story.finished);
      setDone(finishedStories);
      
      // Then, from the remaining stories, handle the ones in sprints
      const unfinishedStories = data.filter((story: StoryType) => !story.finished);
      
      // Stories in product backlog (not in any sprint)
      setProductBacklog(unfinishedStories.filter((story: StoryType) => !story.sprint_id));
      
      // Stories in sprint but not active
      setSprintBacklog(unfinishedStories.filter((story: StoryType) => 
        story.sprint_id && !story.active
      ));
      
      // Stories that are active and have at least one finished subtask go to review
      const reviewStories = unfinishedStories.filter((story: StoryType) => 
        story.sprint_id && story.active && story.subtasks?.some(task => task.finished)
      );
      setInReview(reviewStories);
      
      // Stories that are active but don't have finished subtasks go to in progress
      setInProgress(unfinishedStories.filter((story: StoryType) => 
        story.sprint_id && story.active && 
        !story.subtasks?.some(task => task.finished)
      ));
      
      setError(null);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setError('Failed to load stories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  
  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
    try {
        const res = await fetch(`/api/project/${projectId}`);
        if (!res.ok) throw new Error("Failed to fetch project");
        const data = await res.json();
        setProject(data);
    } catch (error) {
        console.error("Error fetching project:", error);
    }
    };
    fetchProject();
  }, [projectId]);

  // Check user permissions
  useEffect(() => {
    if (session?.user?.username && project?.users) {
        const username = session.user.username;
        const usersList = project.users;
        
        setIsAllowed(
            usersList.includes(`Product Owner: ${username} `) ||
            usersList.includes(`Scrum Master: ${username} `)
        );
    }
  }, [session, project]);

  const fetchSprints = useCallback(async () => {
    try {
      const response = await fetch(`/api/project/${projectId}/sprints`);
      if (!response.ok) {
        throw new Error('Failed to fetch sprints');
      }
      const data = await response.json();
      setSprints(data);
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  }, [projectId]);
  
  useEffect(() => {
    fetchStories();
    fetchSprints();
  }, [fetchStories, fetchSprints]);
  
  const handleStoryAdded = () => {
    fetchStories();
  };
  
  const moveStory = async (storyId: number, destination: string) => {
    try {
      // Find the story
      const story = stories.find(s => s.id === storyId);
      if (!story) {
        setError('Story not found');
        return;
      }
      
      // Create a copy of the story with updated status
      const updatedStory = { 
        ...story,
        // Ensure these properties are always defined
        active: story.active || false,
        finished: story.finished || false,
        project_id: story.project_id || projectId
      };
      
      // Update story based on destination
      switch (destination) {
        case 'productBacklog':
          updatedStory.sprint_id = -1;
          updatedStory.active = false;
          updatedStory.finished = false;
          break;
        case 'sprintBacklog':
          // This is either moving from productBacklog to sprintBacklog
          // or moving backward from inProgress to sprintBacklog
          const activeSprint = sprints.length > 0 ? sprints[0] : null;
          if (!activeSprint && !story.sprint_id) {
            setError('No sprints found. Please create a sprint first.');
            return;
          }
          updatedStory.sprint_id = story.sprint_id || (activeSprint ? activeSprint.id : -1);
          updatedStory.active = false;
          updatedStory.finished = false;
          break;
        case 'inProgress':
          // When moving to inProgress, we need to ensure it stays active
          // If coming from review, we'll still keep it active but it will move
          // from review to in progress in the UI based on task completion
          updatedStory.active = true;
          updatedStory.finished = false;
          
          // Special handling for moving back from review to in progress
          // Need to mark at least one task as incomplete to trigger the move
          if (story.subtasks?.every(task => task.finished)) {
            // We need to update at least one subtask to be incomplete
            // This will be done through a separate API call
            try {
              // Find the first completed task and mark it as incomplete
              const firstCompletedTask = story.subtasks.find(task => task.finished);
              if (firstCompletedTask && firstCompletedTask.id) {
                await fetch(`/api/subtask/${firstCompletedTask.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ finished: false }),
                });
              }
            } catch (taskError) {
              console.error("Error updating task status:", taskError);
              // Continue with the story move even if task update fails
            }
          }
          break;
        case 'inReview':
          // Moving to inReview, ensure sprint_id is kept
          updatedStory.active = true;
          updatedStory.finished = false;
          break;
        case 'done':
          // Moving to done, keep sprint_id
          updatedStory.active = false;
          updatedStory.finished = true;
          break;
        default:
          setError(`Unknown destination: ${destination}`);
          return;
      }
      
      // Send the update to the API
      const response = await fetch(`/api/story/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: storyId,
          sprint_id: updatedStory.sprint_id === null ? null : updatedStory.sprint_id,
          active: updatedStory.active,
          finished: updatedStory.finished,
          project_id: projectId,
          original_sprint_id: story.sprint_id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move story');
      }
      
      // Refresh stories to update the UI
      fetchStories();
      
    } catch (error) {
      console.error('Error moving story:', error);
      setError(error instanceof Error ? error.message : 'Failed to move story');
    }
  };

  if (loading) return <Spinner animation="border" role="status" />;

  return (
    <Container fluid>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      <Row className="mb-4">
        <Col>
          <h2>Project Flow</h2>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          {isAllowed && (
            <AddStoryButton projectId={projectId} onStoryAdded={handleStoryAdded} />
          )}
        </Col>
      </Row>
      <Row>
        <Col md>
          <div className="bg-light p-2 rounded mb-3">
            <h3>Product Backlog</h3>
            {productBacklog.length === 0 ? (
              <p className="text-muted">No stories in product backlog</p>
            ) : (
              productBacklog.map((story) => (
                <Story 
                  key={`story-${story.id}`} 
                  story={{
                    ...story,
                    subtasks: story.subtasks?.map(subtask => ({
                      ...subtask,
                      description: subtask.description || '',
                      finished: subtask.finished || false,
                      rejected: subtask.rejected || false,
                      accepted: subtask.accepted || false
                    })) || []
                  }} 
                  onUpdate={fetchStories} 
                  onMove={(destination) => moveStory(story.id, destination)}
                />
              ))
            )}
          </div>
        </Col>
        
        <Col md>
          <div className="bg-light p-2 rounded mb-3">
            <h3>Sprint Backlog</h3>
            {sprintBacklog.length === 0 ? (
              <p className="text-muted">No stories in sprint backlog</p>
            ) : (
              sprintBacklog.map((story) => (
                <Story 
                  key={`story-${story.id}`} 
                  story={{
                    ...story,
                    subtasks: story.subtasks?.map(subtask => ({
                      ...subtask,
                      description: subtask.description || '',
                      finished: subtask.finished || false,
                      rejected: subtask.rejected || false,
                      accepted: subtask.accepted || false
                    })) || []
                  }}  
                  onUpdate={fetchStories} 
                  onMove={(destination) => moveStory(story.id, destination)}
                />
              ))
            )}
          </div>
        </Col>
        
        <Col md>
          <div className="bg-light p-2 rounded mb-3">
            <h3>In Progress</h3>
            {inProgress.length === 0 ? (
              <p className="text-muted">No stories in progress</p>
            ) : (
              inProgress.map((story) => (
                <Story 
                  key={`story-${story.id}`} 
                  story={{
                    ...story,
                    subtasks: story.subtasks?.map(subtask => ({
                      ...subtask,
                      description: subtask.description || '',
                      finished: subtask.finished || false,
                      rejected: subtask.rejected || false,
                      accepted: subtask.accepted || false
                    })) || []
                  }}  
                  onUpdate={fetchStories} 
                  onMove={(destination) => moveStory(story.id, destination)}
                />
              ))
            )}
          </div>
        </Col>
        
        <Col md>
          <div className="bg-light p-2 rounded mb-3">
            <h3>In Review</h3>
            {inReview.length === 0 ? (
              <p className="text-muted">No stories in review</p>
            ) : (
              inReview.map((story) => (
                <Story 
                  key={`story-${story.id}`} 
                  story={{
                    ...story,
                    subtasks: story.subtasks?.map(subtask => ({
                      ...subtask,
                      description: subtask.description || '',
                      finished: subtask.finished || false,
                      rejected: subtask.rejected || false,
                      accepted: subtask.accepted || false
                    })) || []
                  }} 
                  onUpdate={fetchStories} 
                  onMove={(destination) => moveStory(story.id, destination)}
                />
              ))
            )}
          </div>
        </Col>
        
        <Col md>
          <div className="bg-light p-2 rounded mb-3">
            <h3>Done</h3>
            {done.length === 0 ? (
              <p className="text-muted">No completed stories</p>
            ) : (
              done.map((story) => (
                <Story 
                  key={`story-${story.id}`} 
                  story={{
                    ...story,
                    subtasks: story.subtasks?.map(subtask => ({
                      ...subtask,
                      description: subtask.description || '',
                      finished: subtask.finished || false,
                      rejected: subtask.rejected || false,
                      accepted: subtask.accepted || false
                    })) || []
                  }} 
                  onUpdate={fetchStories} 
                  onMove={(destination) => moveStory(story.id, destination)}
                />
              ))
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ProjectFlow;
