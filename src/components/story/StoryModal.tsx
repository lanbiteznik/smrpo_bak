import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Tabs, Tab, Alert } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { StoryProps } from './Story';
import { useParams } from "next/navigation";
import StoryDetailsTab from './tabs/StoryDetailsTab';
import TasksTab from './tabs/TasksTab';
import CommentsTab from './tabs/CommentsTab';
import RejectionHistoryTab from './tabs/RejectionHistoryTab';

interface Project {
  id: number;
  users: string;
}

interface StoryModalProps {
  show: boolean;
  onHide: () => void;
  story: StoryProps['story'];
  onUpdate: () => void;
  onMove?: (destination: string) => void;
  allowComments?: boolean;
}

const StoryModal: React.FC<StoryModalProps> = ({ 
  show, 
  onHide, 
  story, 
  onUpdate, 
  onMove,
  allowComments = false 
}) => {
  // State variables
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const { data: session } = useSession();
  const params = useParams();
  const projectId = params?.id ? Number(params.id) : null;
  const [project, setProject] = useState<Project | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTaskUpdates, setPendingTaskUpdates] = useState<{ [key: number]: boolean }>({});
  const [isAllowedScrum, setIsAllowedScrum] = useState(false);
  const [isAllowedScrumDev, setIsAllowedScrumDev] = useState(false);
  
  // Derived values - MOVE THIS BEFORE the functions that depend on it
  const isStoryLoaded = !!story && !!story.id;
  const currentUserId = session?.user?.id;
  const isInSprint = isStoryLoaded ? !!story.sprint_id : false;
  const canBeMoved = isStoryLoaded ? !!story.sprint_id : false;

  
  // Fetch project details
  const fetchProject = useCallback(async () => {
    if (projectId === null) return;
    try {
      const response = await fetch(`/api/project/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");

      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
      setError("Failed to load project.");
    }
  }, [projectId]);

  // Check user permissions
  useEffect(() => {
    if (session?.user?.username && project?.users) {
      const username = session.user.username;
      const usersList = project.users;
      
      // Allow if user is admin OR is the Scrum Master for this project
      setIsAllowedScrum(
        usersList.includes(`Scrum Master: ${username} `)
      );
    }
  }, [session, project]);

  // Add this effect under the existing permission checks
  useEffect(() => {
    if (session?.user?.username && project?.users) {
      const username = session.user.username;
      const usersList = project.users;
      
      // Allow if user is Product Owner OR Scrum Master for this project
      setIsAllowedScrum(
        usersList.includes(`Scrum Master: ${username} `) || 
        usersList.includes(`Product Owner: ${username}`)
      );
    }
  }, [session, project]);

  // Check developer permissions
  useEffect(() => {
    if (session?.user?.username && project?.users) {
      const username = session.user.username;
      const usersList = project.users;
      const developersMatch = usersList.match(/Developers:\s*(.+)/);
      const developers = developersMatch ? developersMatch[1].split(",").map(dev => dev.trim()) : [];

      // Allow if user is admin OR is the Scrum Master for this project
      setIsAllowedScrumDev(
        usersList.includes(`Scrum Master: ${username} `) ||
        developers.includes(username)
      );
    }
  }, [session, project]);

  // Save all pending task updates
  const savePendingTaskUpdates = async () => {
    if (Object.keys(pendingTaskUpdates).length === 0) {
      return; // No updates to save
    }
    
    try {
      // Create promises for all task updates
      const updatePromises = Object.entries(pendingTaskUpdates).map(([subtaskId, isCompleted]) => {
        return fetch(`/api/subtask/${subtaskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ finished: isCompleted }),
        });
      });
      
      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
      
      // Check if all updates were successful
      const allSuccessful = results.every(response => response.ok);
      
      if (!allSuccessful) {
        throw new Error('One or more task updates failed');
      }
      
      // Clear pending updates
      setPendingTaskUpdates({});
      setHasUnsavedChanges(false);
      
      // Refresh parent component to reflect changes
      onUpdate();
    } catch (error) {
      console.error('Error updating tasks:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task status');
    }
  };

  const normalizeText = (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  };

  // Check for duplicate title
  const checkDuplicateTitle = async (title: string, storyId: number, projectId: number): Promise<boolean> => {
    try {
      // Fetch all stories in the project
      const response = await fetch(`/api/project/${projectId}/stories`);
      
      if (!response.ok) {
        throw new Error('Failed to check for duplicate titles');
      }
      
      interface StoryWithTitle {
        id: number;
        title?: string | null;
      }
      
      const stories = await response.json() as StoryWithTitle[];

      const normalizedTitle = normalizeText(title);
      console.log('Normalized title:', normalizedTitle);
      stories.forEach((story: StoryWithTitle) => {
        console.log("Comparing with:", normalizeText(story.title || ""), "Original:", story.title);
      });
      
      // Check if any other story in this project has the same title (excluding the current story)
      return stories.some((story: StoryWithTitle) => 
        normalizeText(story.title || "") === normalizedTitle && story.id !== storyId
      );
    } catch (error) {
      console.error('Error checking duplicate titles:', error);
      // If we can't check, assume no duplicates to avoid blocking the user
      return false;
    }
  };

  // Handle safe closing
  const handleHide = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        savePendingTaskUpdates().then(() => {
          setHasUnsavedChanges(false);
          onHide();
        });
      }
    } else {
      onHide();
    }
  };

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Only fetch project data when modal opens
  useEffect(() => {
    if (show) {
      fetchProject();
      setError(null);
      setWarning(null);
      setPendingTaskUpdates({});
      setHasUnsavedChanges(false);
    }
  }, [show, fetchProject]);

  return (
    <>
      {!isStoryLoaded ? (
        <div>Loading story information...</div>
      ) : (
        <Modal show={show} onHide={handleHide} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Story: {story.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {warning && <Alert variant="warning">{warning}</Alert>}
            
            <Tabs defaultActiveKey="story" id="story-tabs" className="mb-3">
              <Tab eventKey="story" title="Story Details">
                <StoryDetailsTab 
                  story={story}
                  isInSprint={isInSprint}
                  isAllowedScrum={isAllowedScrum}
                  canBeMoved={canBeMoved}
                  onMove={onMove}
                  onUpdate={onUpdate}
                  checkDuplicateTitle={checkDuplicateTitle}
                  onHide={handleHide}
                  setError={setError}
                  setWarning={setWarning}
                />
              </Tab>
              
              <Tab eventKey="tasks" title="Tasks">
                <TasksTab 
                  story={story}
                  isInSprint={isInSprint}
                  isAllowedScrum={isAllowedScrum}
                  isAllowedScrumDev={isAllowedScrumDev}
                  currentUserId={currentUserId}
                  onUpdate={onUpdate}
                  setPendingTaskUpdates={setPendingTaskUpdates}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  setError={setError}
                />
              </Tab>
              
              {allowComments && (
                <Tab eventKey="comments" title="Comments">
                  <CommentsTab 
                    story={story}
                    isAllowedScrum={isAllowedScrum}
                    currentUserId={currentUserId}
                    setError={setError}
                  />
                </Tab>
              )}
              
              {story.rejected && (
                <Tab eventKey="rejection-history" title="Rejection History">
                  <RejectionHistoryTab story={story} />
                </Tab>
              )}
            </Tabs>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default StoryModal;