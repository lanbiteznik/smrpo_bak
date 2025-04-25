import React, { useState, useEffect, useCallback } from 'react';
import { Button, Alert, ListGroup, Spinner } from 'react-bootstrap';
import { StoryProps } from '../Story';
import AddTaskModal from '../modals/AddTaskModal';
import EditTaskModal from '../modals/EditTaskModal';
import TaskItem from '../ui/TaskItem';
import { Subtask } from '@/types'; // Import the centralized Subtask interface

// Remove the local Subtask interface definition

interface Developer {
  id: number;
  username: string;
  name: string;
  surname: string;
}

interface TasksTabProps {
  story: StoryProps['story'];
  isInSprint: boolean;
  isAllowedScrum: boolean;
  isAllowedScrumDev: boolean;
  currentUserId: number | undefined;
  onUpdate: () => void;
  setPendingTaskUpdates: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setError: (error: string | null) => void;
}

const TasksTab: React.FC<TasksTabProps> = ({
  story,
  isInSprint,
  isAllowedScrum,
  isAllowedScrumDev,
  currentUserId,
  onUpdate,
  setError
}) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [showEditSubtask, setShowEditSubtask] = useState(false);

  // Fetch subtasks
  const fetchSubtasks = useCallback(async () => {
    if (!story.id) return;

    setLoadingSubtasks(true);
    try {
      const response = await fetch(`/api/subtask?story_id=${story.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubtasks(data);
      } else {
        console.error('Failed to fetch subtasks:', response.statusText);
        setSubtasks([]);
      }
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      setSubtasks([]);
    } finally {
      setLoadingSubtasks(false);
    }
  }, [story.id]);

  // Fetch developers
  const fetchDevelopers = useCallback(async () => {
    if (!story.project_id) return;
    
    try {
      const response = await fetch(`/api/project/${story.project_id}/developers`);
      if (response.ok) {
        const data = await response.json();
        setDevelopers(data);
      } else {
        console.error('Failed to fetch developers:', response.statusText);
        setDevelopers([]);
      }
    } catch (error) {
      console.error('Error fetching developers:', error);
      setDevelopers([]);
    } finally {
    }
  }, [story.project_id]);

  // Fetch data on component mount
  useEffect(() => {
    fetchSubtasks();
    fetchDevelopers();
  }, [fetchSubtasks, fetchDevelopers]);

  // Handle task completion
  const handleTaskCompletion = async (subtaskId: number, isCompleted: boolean) => {
    // Check if the task is assigned to the current user and has been accepted
    const targetSubtask = subtasks?.find(s => s.id === subtaskId);
    if (!targetSubtask) {
      setError("Task not found");
      return;
    }
    
    // Allow admins/Scrum Masters to complete any task
    if (!isAllowedScrum) {
      // Prevent completing unassigned tasks
      if (targetSubtask.assignee === null) {
        setError("You must claim this task before completing it");
        return;
      }
      
      // Check if task is assigned to someone else (use Number for proper comparison)
      if (Number(targetSubtask.assignee) !== Number(currentUserId) && 
          targetSubtask.rejected !== true) {
        setError("You can only complete tasks assigned to you");
        return;
      }
    
      // If the task is assigned to the current user but hasn't been accepted yet
      if (Number(targetSubtask.assignee) === Number(currentUserId) && 
          targetSubtask.rejected === null) {
        setError("You need to accept this task before marking it as completed");
        return;
      }
    }

    try {
      // First update the UI for immediate feedback
      setSubtasks(prev => 
        prev.map(subtask => 
          subtask.id === subtaskId 
            ? { ...subtask, finished: isCompleted } 
            : subtask
        )
      );

      // Then send the update to the server
      const response = await fetch(`/api/subtask/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finished: isCompleted })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task status');
      }
      
      // Remove this line to prevent immediate refresh
      // onUpdate(); 
      
    } catch (error) {
      console.error('Error updating task status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task status');
      
      // Revert the UI change if the server update fails
      setSubtasks(prev => 
        prev.map(subtask => 
          subtask.id === subtaskId 
            ? { ...subtask, finished: !isCompleted } // Revert to original state
            : subtask
        )
      );
    }
  };

  // Handle accepting a task
  const handleAcceptTask = async (subtaskId: number) => {
    try {
      const response = await fetch(`/api/subtask/${subtaskId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to accept task');
        return;
      }
      
      const updatedSubtask = await response.json();
      
      // Update the subtask in the list
      setSubtasks(subtasks.map(st => 
        st.id === subtaskId ? updatedSubtask : st
      ));
      
      // Notify parent component
      onUpdate();
    } catch (error) {
      console.error('Error accepting task:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept task');
    }
  };

  // Handle rejecting a task
  const handleRejectTask = async (subtaskId: number) => {
    try {
      const response = await fetch(`/api/subtask/${subtaskId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reject task');
        return;
      }
      
      const updatedSubtask = await response.json();
      
      // Update the subtask in the list
      setSubtasks(subtasks.map(st => 
        st.id === subtaskId ? updatedSubtask : st
      ));
      
      // Notify parent component
      onUpdate();
    } catch (error) {
      console.error('Error rejecting task:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject task');
    }
  };

  // Handle claiming an unassigned task
  const handleClaimTask = async (subtaskId: number) => {
    try {
      const response = await fetch(`/api/subtask/${subtaskId}/claim`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to claim task');
        return;
      }
      
      const updatedSubtask = await response.json();
      
      // Update the subtask in the list
      setSubtasks(subtasks.map(st => 
        st.id === subtaskId ? updatedSubtask : st
      ));
      
      // Notify parent component
      onUpdate();
    } catch (error) {
      console.error('Error claiming task:', error);
      setError(error instanceof Error ? error.message : 'Failed to claim task');
    }
  };

  // Handle editing a subtask
  const handleEditSubtask = (subtask: Subtask) => { 
    setEditingSubtask(subtask);
    setShowEditSubtask(true);
  };

  // Handle deleting a subtask
  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      const response = await fetch(`/api/subtask?id=${subtaskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete subtask');
      }
      
      // Remove the subtask from the list
      setSubtasks(subtasks.filter(st => st.id !== subtaskId));
      
      // Close the edit modal if it's open
      if (showEditSubtask && editingSubtask?.id === subtaskId) {
        setShowEditSubtask(false);
        setEditingSubtask(null);
      }
      
      // Notify parent component
      onUpdate();
    } catch (error) {
      console.error('Error deleting subtask:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete task');
    }
  };

  // Handle successful task creation
  const handleTaskCreated = (newTask: Subtask) => {
    setSubtasks([...subtasks, newTask]);
    setShowAddSubtask(false);
    onUpdate();
  };

  // Handle successful task update
  const handleTaskUpdated = (updatedTask: Subtask) => {
    setSubtasks(subtasks.map(st => 
      st.id === updatedTask.id ? updatedTask : st
    ));
    setShowEditSubtask(false);
    setEditingSubtask(null);
    onUpdate();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Tasks</h5>
        {isAllowedScrumDev && isInSprint ? (
          <Button variant="primary" size="sm" onClick={() => setShowAddSubtask(true)}>
            Add Task
          </Button>
        ) : (
          <Button variant="primary" size="sm" disabled title="Story must be in a sprint to add tasks">
            Add Task
          </Button>
        )}
      </div>
      
      {!isInSprint && (
        <Alert variant="info">
          Tasks can only be added once the story is in a sprint.
        </Alert>
      )}
              
      {loadingSubtasks ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" /> Loading tasks...
        </div>
      ) : subtasks.length === 0 ? (
        <Alert variant="info">No tasks have been created for this story.</Alert>
      ) : (
        <ListGroup variant="flush">
          {subtasks.map((subtask) => (
            <TaskItem
              key={subtask.id}
              subtask={subtask}
              currentUserId={currentUserId}
              isAllowedScrumDev={isAllowedScrumDev}
              onComplete={handleTaskCompletion}
              onClaim={handleClaimTask}
              onAccept={handleAcceptTask}
              onReject={handleRejectTask}
              onEdit={handleEditSubtask}
              onDelete={handleDeleteSubtask}
            />
          ))}
        </ListGroup>
      )}

      {/* Add Task Modal */}
      <AddTaskModal 
        show={showAddSubtask && isInSprint}
        onHide={() => setShowAddSubtask(false)}
        storyId={story.id}
        developers={developers}
        isAllowedScrum={isAllowedScrum}
        setError={setError}
        onTaskCreated={handleTaskCreated}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        show={showEditSubtask}
        onHide={() => setShowEditSubtask(false)}
        subtask={editingSubtask}
        developers={developers}
        isAllowedScrum={isAllowedScrum}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleDeleteSubtask}
      />
    </div>
  );
};

export default TasksTab;
