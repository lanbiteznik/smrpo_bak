import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Dropdown, Alert, Spinner } from 'react-bootstrap';
import Story from '../story/Story';

interface ProjectBacklogProps {
  projectId: number;
}

interface Story {
  id: number;
  title?: string | null;
  description?: string | null;
  time_required?: number | null;
  priority?: number | null;
  business_value?: number | null;
  sprint_id?: number | null;
  finished?: boolean | null;
  rejected?: boolean | null;
  rejected_description?: string | null;
  rejected_time_required?: number | null;
}

const ProjectBacklog: React.FC<ProjectBacklogProps> = ({ projectId }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimationFilter, setEstimationFilter] = useState<'all' | 'estimated' | 'unestimated'>('all');
  
  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/story?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }
      
      const data = await response.json();
      setStories(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);
  
  // Filter stories based on estimation status
  const filteredStories = stories.filter(story => {
    // First filter out stories that are in sprints
    if (story.sprint_id) return false;
    
    // Then apply estimation filter
    if (estimationFilter === 'all') return true;
    if (estimationFilter === 'estimated') return story.time_required !== null;
    if (estimationFilter === 'unestimated') return story.time_required === null;
    return true;
  });
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }
  
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  return (
    <Container className="project-backlog">
      <Row className="mb-4">
        <Col>
          <h2>Project Backlog</h2>
          <p>Stories not yet assigned to sprints</p>
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col>
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" id="estimation-filter">
              Estimation: {estimationFilter === 'all' ? 'All Stories' : 
                          estimationFilter === 'estimated' ? 'Estimated Only' : 
                          'Unestimated Only'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setEstimationFilter('all')}>All Stories</Dropdown.Item>
              <Dropdown.Item onClick={() => setEstimationFilter('estimated')}>Estimated Only</Dropdown.Item>
              <Dropdown.Item onClick={() => setEstimationFilter('unestimated')}>Unestimated Only</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>
      
      <Row>
        <Col>
          {filteredStories.length === 0 ? (
            <Alert variant="info">No stories in the backlog match the current filters.</Alert>
          ) : (
            filteredStories.map(story => (
              <Story 
                key={story.id} 
                story={{
                  id: story.id,
                  title: story.title || undefined,
                  description: story.description || undefined,
                  time_required: story.time_required || undefined,
                  priority: story.priority || undefined,
                  business_value: story.business_value || undefined,
                  sprint_id: story.sprint_id || undefined,
                  finished: story.finished || undefined,
                  rejected: story.rejected || undefined
                }}
                onUpdate={fetchStories} 
              />
            ))
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ProjectBacklog;