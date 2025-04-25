"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Story } from "@/app/models/models";
import { Container, Row, Col, Card, Badge, Tabs, Tab, Spinner, Alert, Button, Modal } from 'react-bootstrap';
import SprintBurndown from './SprintBurndown';
import DailyScrumTracker from '../DailyScrumTracker';
import EditSprintButton from './EditSprintButton';

interface Sprint {
  id: number;
  title: string;
  start_date: string;
  finish_date: string;
  velocity: number;
  active: boolean | null;
  project_id: number;
}

interface SprintBoardProps {
  sprintNumber: number;
  onSprintDeleted?: () => void;
  isScrumMaster?: boolean;
  onSprintUpdated?: () => void;
  projectId: number;
}

// Update the fetchWithRetry function
const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {}, 
  retries = 5, 
  delay = 1000,
  backoff = 1.5
): Promise<Response> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retries <= 1) throw error;
    
    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    console.log(`Retrying fetch to ${url}, ${retries-1} retries left (next retry in ${delay * backoff}ms)`);
    return fetchWithRetry(url, options, retries - 1, delay * backoff, backoff);
  }
};

const SprintBoard: React.FC<SprintBoardProps> = ({ sprintNumber, onSprintDeleted, isScrumMaster, onSprintUpdated, projectId }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add this function to handle sprint deletion
  const handleDeleteSprint = async () => {
    if (!sprint) return;
    
    setDeleting(true);
    try {
      const response = await fetchWithRetry(`/api/sprint/${sprintNumber}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete sprint');
      }
      
      // Call the callback to refresh the sprints list
      if (onSprintDeleted) {
        onSprintDeleted();
      }
    } catch (err) {
      console.error("Error deleting sprint:", err);
      setError(`Failed to delete sprint. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Fetch sprint data with improved error handling and retry logic
  const fetchSprint = useCallback(async () => {
    if (!sprintNumber) return;
    
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/sprint/${sprintNumber}`);
      const data = await res.json();
      setSprint(data);
    } catch (err) {
      console.error("Error fetching sprint:", err);
      setError(`Failed to load sprint details. ${err instanceof Error ? err.message : ''}`);
    }
  }, [sprintNumber]);

  // Fetch stories for the sprint with improved error handling and retry logic
  const fetchSprintStories = useCallback(async () => {
    if (!sprintNumber) return;
    
    try {
      const res = await fetchWithRetry(`/api/sprint/${sprintNumber}/stories`);
      const data = await res.json();
      
      setStories(data);
      
      
    } catch (err) {
      console.error("Error fetching sprint stories:", err);
      setError(`Failed to load sprint stories. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [sprintNumber]);

  // Load data initially
  useEffect(() => {
    if (!sprintNumber) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await fetchSprint();
        await fetchSprintStories();
      } catch (err) {
        console.error("Error loading sprint data:", err);
        setError(`Failed to load sprint data. ${err instanceof Error ? err.message : ''}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, [sprintNumber, fetchSprint, fetchSprintStories]);

  // Handle manual retry
  const handleRetry = () => {
    setIsRetrying(true);
    setLoading(true);
    fetchSprint().then(fetchSprintStories);
  };

  // Format date function
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-2" />
          <p className="mb-0">{isRetrying ? "Reconnecting..." : "Loading sprint data..."}</p>
          {isRetrying && (
            <p className="text-muted small">If this takes too long, try refreshing the page.</p>
          )}
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>{isOnline ? 'Error Loading Sprint Board' : 'Network Connection Lost'}</Alert.Heading>
          <p>{isOnline ? error : 'Please check your internet connection and try again.'}</p>
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={handleRetry}>
              {isRetrying ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Retrying...
                </>
              ) : (
                'Retry'
              )}
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      {/* Debug information - Remove after testing */}
    
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{sprint?.title}</h2>
        {isScrumMaster && (
          <div>
            {sprint && (
              <>
              {(sprint.active === true || sprint.active === false) && (
              <EditSprintButton 
                sprint={sprint}
                projectId={projectId}
                onSprintUpdated={() => {
                  onSprintUpdated?.();
                  fetchSprint();
                  fetchSprintStories(); 
                }}
              />
              )}
              {sprint.active === false && (
                <Button 
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Sprint
                </Button>
              )}
              </>
            )}
          </div>
        )}
      </div>
      
      <Tabs defaultActiveKey="overview" className="mb-3">
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col md={8}>
              <SprintBurndown sprintId={sprintNumber} />
            </Col>
            <Col md={4}>
              <Card className="mb-4">
                <Card.Header>Sprint Details</Card.Header>
                <Card.Body>
                  <p><strong>Start Date:</strong> {formatDate(sprint?.start_date)}</p>
                  <p><strong>End Date:</strong> {formatDate(sprint?.finish_date)}</p>
                  <p><strong>Velocity:</strong> {sprint?.velocity ?? "N/A"}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <Badge bg={
                      sprint?.active === true ? "success" :
                      sprint?.active === null ? "info" :
                      "secondary"
                    }>
                      {sprint?.active === true
                        ? "In Progress"
                        : sprint?.active === null
                        ? "Completed"
                        : "Inactive"}
                    </Badge>
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        <Tab eventKey="stories" title="Stories">
          <Card>
            <Card.Header>Sprint Stories</Card.Header>
            <Card.Body>
              {sprint?.active === true || sprint?.active === null && (
                <p className="text-muted">Stories in this sprint cannot be modified once the sprint has started.</p>
              )}              
              {stories.map(story => (
                <Card key={story.id} className="mb-3">
                  <Card.Body>
                    <h5>{story.title}</h5>
                    <Badge bg="primary" className="me-2">{story.time_required || 0} points</Badge>
                    <Badge bg="secondary">{story.business_value ? "Must Have" : "Should Have"}</Badge>
                    {story.description && (
                      <Card.Text className="story-description whitespace-pre-wrap">
                        <strong>Description: </strong>{`\n`}
                        {story.description.length > 100
                          ? `${story.description.substring(0, 100)}...`
                          : story.description}
                      </Card.Text>
                    )}                 
                    {story.tests && (
                      <>
                        <strong>Acceptance Tests: </strong>
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
                      <div>
                        <h6>Tasks:</h6>
                        <ul>
                          {story.subtasks.map(task => (
                            <li key={task.id}>
                              {task.description}
                              {task.finished && <Badge bg="success" className="ms-2">Done</Badge>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
              
              {stories.length === 0 && (
                <p className="text-muted">No stories in this sprint</p>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="daily-scrum" title="Daily Scrum">
          <DailyScrumTracker sprintId={sprintNumber} active={sprint?.active}/>
        </Tab>
      </Tabs>

      {/* Add delete confirmation modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Sprint Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this sprint? This action cannot be undone.</p>
          <p>All stories in this sprint will be moved back to the product backlog.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteSprint}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete Sprint'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SprintBoard;