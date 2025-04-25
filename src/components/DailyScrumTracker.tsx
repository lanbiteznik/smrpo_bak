import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup, Alert, Spinner } from 'react-bootstrap';

interface ScrumEntry {
  id?: number;
  date: string;
  yesterday: string;
  today: string;
  blockers: string;
  person_name?: string;
}

interface DailyScrumTrackerProps {
  sprintId: number;
  active?: boolean | null;
}

const DailyScrumTracker: React.FC<DailyScrumTrackerProps> = ({ sprintId, active }) => {
  const [entries, setEntries] = useState<ScrumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newEntry, setNewEntry] = useState<ScrumEntry>({
    date: new Date().toISOString().split('T')[0],
    yesterday: '',
    today: '',
    blockers: ''
  });
  const [success, setSuccess] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sprint/${sprintId}/daily-scrum`);
        
        // Check if the response is okay
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch entries');
        }
        
        const data = await response.json();
        
        // If no entries yet, use empty array
        setEntries(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching scrum entries:', error);
        // Provide fallback data instead of showing error
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEntries();
  }, [sprintId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/sprint/${sprintId}/daily-scrum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntry),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save entry');
      }
      
      const savedEntry = await response.json();
      setEntries([savedEntry, ...entries]);
      
      // Reset form
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        yesterday: '',
        today: '',
        blockers: ''
      });
      
      // Show success message
      setSuccess('Daily standup update saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving scrum entry:', error);
      setError('Failed to save daily update');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </Card.Body>
      </Card>
    );
  }
  
  return (
    <Card className="mb-4">
      <Card.Header>Daily Scrum Tracker</Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        {( active === true &&
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={newEntry.date}
                onChange={handleChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>What did you do yesterday?</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="yesterday"
                value={newEntry.yesterday}
                onChange={handleChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>What will you do today?</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="today"
                value={newEntry.today}
                onChange={handleChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Any blockers?</Form.Label>
              <Form.Control
                as="textarea"
                rows={1}
                name="blockers"
                value={newEntry.blockers}
                onChange={handleChange}
                placeholder="Leave empty if none"
              />
            </Form.Group>
            
            <Button 
              variant="primary" 
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Daily Update'}
            </Button>
          </Form>
          )}
        <hr />
        
        <h5>Previous Updates</h5>
        {entries.length === 0 ? (
          <p className="text-muted">No updates recorded</p>
        ) : (
          <ListGroup>
            {entries.map((entry, index) => (
              <ListGroup.Item key={entry.id || index}>
                <div className="d-flex justify-content-between">
                  <strong>{entry.date}</strong>
                  {entry.person_name && <span className="text-muted">{entry.person_name}</span>}
                </div>
                <p className="mb-1"><strong>Yesterday:</strong> {entry.yesterday}</p>
                <p className="mb-1"><strong>Today:</strong> {entry.today}</p>
                {entry.blockers && <p className="mb-0"><strong>Blockers:</strong> {entry.blockers}</p>}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default DailyScrumTracker;