"use client";

import React, { useState, use, useEffect, useCallback } from 'react';
import { Nav, Container, Accordion} from 'react-bootstrap';
import ProjectFlow from '../../../components/project/ProjectFlow';
import ProductBacklog from '../../../components/ProductBacklog';
import SprintBacklog from '../../../components/sprint/SprintBacklog';
import AddSprintButton from '../../../components/sprint/AddSprintButton';
import SprintBoard from '../../../components/sprint/SprintBoard';
import { useSession } from 'next-auth/react';
import ProjectWall from '../../../components/project/ProjectWall';

interface Project {
  id: number;
  title: string;
  description: string;
  users: string;
  active: boolean | null;
}

interface Sprint {
  id: number;
  title: string;
  start_date: string;
  finish_date: string;
}

const Project = ({ params }: { params: Promise<{ id: string }> }) => {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const projectId = parseInt(unwrappedParams.id);
  const { data: session } = useSession();
  
  // State for checking if user is a Product Owner for this specific project
  const [isProductOwner, setIsProductOwner] = useState(false);
  
  // Default to board for most users, Product Owners will be redirected to backlog in useEffect
  const [activeTab, setActiveTab] = useState('board');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScrumMaster, setIsScrumMaster] = useState(false);
  const [sprintsLoaded, setSprintsLoaded] = useState(false);

  // Ensure Product Owner can't switch to other tabs
  const handleTabChange = (tab: string) => {
    if (isProductOwner && tab !== 'backlog' && tab !== 'wall') {
      return;
    }
    setActiveTab(tab);
  };

  // Check user permissions
  useEffect(() => {
    if (session?.user?.username && project?.users) {
      const username = session.user.username;
  
      // Split roles by '|' and trim whitespace
      const roles = project.users
        .split('|')
        .map(role => role.trim());
  
      const isPO = roles.some(role => role === `Product Owner: ${username}`);
      const isSM = roles.some(role => role === `Scrum Master: ${username}`);
  
      setIsProductOwner(isPO);
      setIsScrumMaster(isSM);
  
      if (isPO && activeTab !== 'backlog' && activeTab !== 'wall') {
        setActiveTab('backlog');
      }
    }
  }, [session, project, activeTab]);
  
  
  // Use useCallback to memoize the fetchSprints function
  const fetchSprints = useCallback(async () => {
    setSprintsLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/sprints`);
      if (!response.ok) throw new Error("Failed to fetch sprints");
      const data = await response.json();
      setSprints(data);
      setSprintsLoaded(true);
    } catch (error) {
      console.error("Error fetching sprints:", error);
      setError("Failed to load sprints");
    } finally {
      setSprintsLoading(false);
    }
  }, [projectId]); // Only depend on projectId

  const handleSprintAdded = () => {
    fetchSprints();
  };

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/project/${projectId}`);
      if (!response.ok) throw new Error("Failed to load project");
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'sprints' && !sprintsLoaded) {
      fetchSprints();
    }
  }, [activeTab, fetchSprints, sprintsLoaded]);

  if (loading) return <p>Loading...</p>;
  if (!project) return <p>Project not found.</p>;

  return (
    <Container className="mt-4">

      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link
            active={activeTab === 'wall'}
            onClick={() => handleTabChange('wall')}
          >
            Project Wall
          </Nav.Link>
        </Nav.Item>
        {/* Only show Board tab if not Product Owner */}
        {!isProductOwner && (
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'board'} 
              onClick={() => handleTabChange('board')}
            >
              Board
            </Nav.Link>
          </Nav.Item>
        )}
        
        {/* Always show Product Backlog tab */}
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'backlog'} 
            onClick={() => handleTabChange('backlog')}
          >
            Product Backlog
          </Nav.Link>
        </Nav.Item>
        
        {/* Only show Sprint Backlog tab if not Product Owner */}
        {!isProductOwner && (
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'sprintBacklog'} 
              onClick={() => handleTabChange('sprintBacklog')}
            >
              Sprint Backlog
            </Nav.Link>
          </Nav.Item>
        )}
        
        {/* Only show Sprints tab if not Product Owner */}
        {!isProductOwner && (
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'sprints'} 
              onClick={() => handleTabChange('sprints')}
            >
              Sprints
            </Nav.Link>
          </Nav.Item>
        )}
      </Nav>
      
      {/* Only render the relevant tab content */}
      {activeTab === 'wall' && <ProjectWall projectId={projectId} projectUsers={project?.users || ""} />}
      {activeTab === 'board' && !isProductOwner && <ProjectFlow projectId={projectId} />}
      {activeTab === 'backlog' && <ProductBacklog projectId={projectId} isProductOwner={isProductOwner} isScrumMaster={isScrumMaster} />}
      {activeTab === 'sprintBacklog' && !isProductOwner && <SprintBacklog projectId={projectId} />}
      {activeTab === 'sprints' && (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Sprints</h2>
            {isScrumMaster && (
              <AddSprintButton 
                projectId={projectId} 
                onSprintAdded={handleSprintAdded} 
              />
            )}
          </div>
          
          {sprintsLoading ? (
            <p>Loading sprints...</p>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : sprints.length === 0 ? (
            <p>No sprints available. {isScrumMaster ? 'Create a new sprint using the button above.' : ''}</p>
          ) : (
            <Accordion>
              {sprints.map((sprint) => (
  <Accordion.Item key={sprint.id} eventKey={sprint.id.toString()}>
    <Accordion.Header>
      <div className="d-flex justify-content-between align-items-center w-100 me-3">
        <span>{sprint.title}</span>
        <small className="text-muted">
          {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.finish_date).toLocaleDateString()}
        </small>
      </div>
    </Accordion.Header>
    <Accordion.Body>
    <SprintBoard sprintNumber={sprint.id} onSprintDeleted={fetchSprints} isScrumMaster={isScrumMaster} onSprintUpdated={fetchSprints} projectId={projectId} />
    </Accordion.Body>
  </Accordion.Item>
))}
            </Accordion>
          )}
        </div>
      )}
    </Container>
  );
};

export default Project;
