"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button, Table, Spinner, Form, Alert } from "react-bootstrap";
import { useSession } from "next-auth/react";

interface Log {
    id: number;
    date: string;
    duration: number;
    estimated_remaining: number;
    start_time: string | null;
    end_time: string | null;
    person?: {
        id: number;
        name: string;
        lastname: string;
        username: string;
      };      
  }

  interface TimeLogPanelProps {
    subtaskId: number;
    accepted: boolean;
    assignee: number | null;
    finished: boolean;
    timeRequired: number;
    setTimeRequired?: (value: number) => void;
    sprintStart: string; 
    sprintEnd: string;  
  }
  
const TimeLogPanel: React.FC<TimeLogPanelProps> = ({ subtaskId, assignee, accepted, finished, timeRequired, setTimeRequired, sprintStart, sprintEnd  }) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editRemaining, setEditRemaining] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const [liveDuration, setLiveDuration] = useState<number | null>(null);
  const currentUserId = session?.user?.id;
  const [newLogDate, setNewLogDate] = useState<string>('');
  const [newLogDuration, setNewLogDuration] = useState<number>(0);
  const [editingTimeRequired, setEditingTimeRequired] = useState(false);
  const [internalTimeRequired, setInternalTimeRequired] = useState(timeRequired);
  const [timeRequiredDraft, setTimeRequiredDraft] = useState(timeRequired);
  const [dateValid, setDateValid] = useState<boolean>(true);
  const [newEstimatedRemaining, setNewEstimatedRemaining] = useState<number>(0);
  const [stopEstimatedRemaining, setStopEstimatedRemaining] = useState<number>(0);
  const [stopTrackingError, setStopTrackingError] = useState<string | null>(null);

  // Sync internal value if parent updates (not during editing)
  useEffect(() => {
    if (!editingTimeRequired) {
      setInternalTimeRequired(timeRequired);
      setTimeRequiredDraft(timeRequired);
    }
  }, [timeRequired, editingTimeRequired]);
  

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subtask/${subtaskId}/timelog`);
      const data: Log[] = await res.json();
      setLogs(data);
  
      const activeLog = data.find(log => log.start_time && !log.end_time);
      if (activeLog) {
        const start = new Date(activeLog.start_time!);
        const now = new Date();
        const secondsElapsed = (now.getTime() - start.getTime()) / 1000;
        const hours = secondsElapsed / 3600;
        setLiveDuration(hours + activeLog.duration);
      } else {
        setLiveDuration(null);
      }
  
      setIsTracking(data.some(log => log.start_time && !log.end_time));
  
    } catch (err) {
      console.error("Error loading logs", err);
      setError("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [subtaskId]);
  
  const handleUpdateTimeRequired = async () => {
    const res = await fetch(`/api/subtask/${subtaskId}/time-required`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time_required: timeRequiredDraft }),
    });
  
    if (res.ok) {
      setInternalTimeRequired(timeRequiredDraft);
      if (setTimeRequired) setTimeRequired(timeRequiredDraft);
      setEditingTimeRequired(false);
  
      // Re-fetch logs, then recalculate remaining right after
      const res = await fetch(`/api/subtask/${subtaskId}/timelog`);
      const updatedLogs: Log[] = await res.json();
      setLogs(updatedLogs);
  
      // Force recalc manually
      setInternalTimeRequired(timeRequiredDraft); // just to be safe
      setLogs(updatedLogs); // triggers re-render using fresh logs
      // remaining will re-render on its own, since both values changed
  
    } else {
      setError("Failed to update estimated time.");
    }
  };
  
  const handleManualLog = async () => {
    if (!newLogDate || newLogDuration <= 0) return;
  
    try {
      const res = await fetch(`/api/subtask/${subtaskId}/timelog/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: newLogDate, 
          duration: newLogDuration, 
          estimated_remaining: newEstimatedRemaining 
        }),
      });

      await fetch(`/api/subtask/${subtaskId}/time-required`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_required: newEstimatedRemaining }),
      });

      setInternalTimeRequired(newEstimatedRemaining);
  
      if (!res.ok) throw new Error('Failed to create manual log');
  
      setNewLogDate('');
      setNewLogDuration(0);
      setNewEstimatedRemaining(0);
      fetchLogs();
    } catch (err) {
      setError("Failed to add manual log");
      console.error(err);
    }
  };
  

  const isDateWithinSprint = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const start = new Date(sprintStart);
    const end = new Date(sprintEnd);
    return date >= start && date <= end;
  };  

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
  
    if (isTracking) {
      interval = setInterval(() => {
        setLiveDuration((prev) => (prev ? prev + 1 / 3600 : null));
      }, 1000); 
    }
  
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking]);
  

  useEffect(() => {
    if (subtaskId) {
      fetchLogs();
    }
  }, [subtaskId, fetchLogs]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const handleEdit = (log: Log) => {
    setEditingLogId(log.id);
    setEditDuration(log.duration);
    setEditRemaining(log.estimated_remaining ?? 0);
  };

  const handleSave = async (logId: number) => {
    const res = await fetch(`/api/subtask/${subtaskId}/timelog/${logId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: editDuration,
        estimated_remaining: editRemaining,
      }),
    });

    if (res.ok) {
      setEditingLogId(null);
      fetchLogs();
    }
  };

  const handleDelete = async (logId: number) => {
    if (!confirm("Delete this log?")) return;
    await fetch(`/api/subtask/${subtaskId}/timelog/${logId}`, {
      method: "DELETE",
    });
    fetchLogs();
  };

  const handleStart = async () => {
    try {
      const resCheck = await fetch(`/api/subtask/active`, {
        method: "GET",
      });
  
      if (!resCheck.ok) {
        throw new Error("Failed to check active tracking.");
      }
  
      const data = await resCheck.json();
  
      if (data.active) {
        setError("You are already tracking another task. Stop it before starting a new one.");
        return;
      }
  
      const resStart = await fetch(`/api/subtask/${subtaskId}/timelog/start`, {
        method: "POST",
      });
  
      if (!resStart.ok) {
        throw new Error("Failed to start time tracking.");
      }
  
      setIsTracking(true);
      setLiveDuration(0);
      await fetchLogs();
    } catch (err) {
      console.error("Error starting tracking:", err);
      setError("Failed to start tracking properly.");
    }
  };
  
  const hasLogForDate = (dateStr: string): boolean => {
    return logs.some(log => {
      const logDate = new Date(log.date);
      const inputDate = new Date(dateStr);
  
      return (
        logDate.getFullYear() === inputDate.getFullYear() &&
        logDate.getMonth() === inputDate.getMonth() &&
        logDate.getDate() === inputDate.getDate()
      );
    });
  };
  
  
  const handleStop = async () => {
    if (stopEstimatedRemaining <= 0) {
      setStopTrackingError("Please set the new estimated time remaining before stopping tracking.");
      return;
    }
  
    setStopTrackingError(null);
  
    try {
      const res = await fetch(`/api/subtask/${subtaskId}/timelog/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimated_remaining: stopEstimatedRemaining }),
      });
  
      if (!res.ok) throw new Error("Nothing to stop?");
  
      await fetch(`/api/subtask/${subtaskId}/time-required`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_required: stopEstimatedRemaining }),
      });
  
      setInternalTimeRequired(stopEstimatedRemaining);
      setStopEstimatedRemaining(0);
      fetchLogs();
    } catch (err) {
      console.error(err);
      setError("Failed to stop time tracking.");
    }
  };
  
  function formatDuration(hours: number): string {
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
  
    return `${h}h ${m}m ${s}s`;
  }

  function displayTime(hours: number): string {
    const isNegative = hours < 0;
    const totalMinutes = Math.round(Math.abs(hours) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
  
    return `${isNegative ? "-" : ""}${h}h ${m}m`;
  }
  
    const canLogTime =
    currentUserId &&
    currentUserId == assignee &&
    accepted &&
    !finished;

    //const totalLogged = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const latestLog = logs.length > 0 ? logs.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
    const remaining = latestLog ? latestLog.estimated_remaining : internalTimeRequired;
 

  return (
    <div className="mt-4">
      <h5 className="mb-3">Time Tracking</h5>

      {error && <Alert variant="danger">{error}</Alert>}

      {currentUserId == assignee && !finished && (
        <>
            {canLogTime && (
            <div className="mb-3">
            <h6>Manual Time Log</h6>
              <div className="d-flex flex-wrap gap-2 align-items-center">
            
                <Form.Group>
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={newLogDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewLogDate(value);
                      setDateValid(isDateWithinSprint(value) && value <= todayStr);
                    }}
                    min={sprintStart}
                    max={todayStr}
                  />
                </Form.Group>
            
                <Form.Group>
                  <Form.Label>Hours worked</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Hours worked"
                    min={0.01}
                    step={0.01}
                    value={newLogDuration}
                    onChange={(e) => setNewLogDuration(parseFloat(e.target.value))}
                  />
                </Form.Group>
            
                <Form.Group>
                  <Form.Label>Estimated time remaining (hours)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Estimated remaining"
                    min={0}
                    step={0.1}
                    value={newEstimatedRemaining}
                    onChange={(e) => setNewEstimatedRemaining(parseFloat(e.target.value))}
                  />
                </Form.Group>
            
                <div className="d-flex align-items-end">
                  <Button
                    size="sm"
                    onClick={handleManualLog}
                    disabled={hasLogForDate(newLogDate) || !dateValid}
                  >
                    Add Log
                  </Button>
                </div>
            
              </div>
            
              {hasLogForDate(newLogDate) && (
                <div className="text-danger small mt-1">
                  A log already exists for this date.
                </div>
              )}
              {!dateValid && newLogDate && (
                <div className="text-danger small mt-1">
                  The selected date is outside the current sprint or in the future.
                </div>
              )}
            </div>
            )}

            <div className="mb-3 d-flex gap-2 align-items-center">
            {accepted ? (
                <Button
                variant={isTracking ? "danger" : "success"}
                onClick={isTracking ? handleStop : handleStart}
                >
                {isTracking ? "🛑 Stop Tracking" : "▶️ Start Tracking"}
                </Button>
            ) : (
                <div className="text-muted">
                👷 You must accept the task before you can log time.
                </div>
            )}
            {isTracking && (
              <div className="d-flex flex-column mt-2">
                <Form.Group>
                  <Form.Label>Estimated Time Remaining (after stopping)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    step={0.1}
                    value={stopEstimatedRemaining}
                    onChange={(e) => setStopEstimatedRemaining(parseFloat(e.target.value))}
                    placeholder="Enter new estimated remaining time"
                  />
                </Form.Group>
                {stopTrackingError && (
                  <Alert variant="warning" className="mt-2">
                    {stopTrackingError}
                  </Alert>
                )}

              </div>
            )}
            </div>
        </>
        )}

      {isTracking && liveDuration !== null && (
        <div className="text-muted small">
            ⏱️ Tracking: {formatDuration(liveDuration)}
        </div>
        )}

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time Logged</th>
              <th>Estimated Remaining</th> 
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className={log.start_time && !log.end_time ? "table-warning" : ""}>
                <td>
                  <div>{new Date(log.date).toLocaleDateString()}</div>
                  {log.person && (
                    <div className="text-muted small">
                      <span className="fw-bold">{log.person.name} {log.person.lastname}</span>{" "}
                      <span className="text-secondary">(@{log.person.username})</span>
                    </div>
                  )}
                </td>

                <td>
                  {editingLogId === log.id ? (
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.01}
                      value={Number(editDuration.toFixed(2))}
                      onChange={(e) => setEditDuration(parseFloat(e.target.value.replace(',', '.')))}
                    />
                  ) : (
                    !log.end_time && liveDuration !== null
                      ? displayTime(liveDuration)
                      : displayTime(log.duration)
                  )}
                </td>

                <td>
                  {editingLogId === log.id ? (
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number(editRemaining.toFixed(2))}
                      onChange={(e) => setEditRemaining(parseFloat(e.target.value.replace(',', '.')))}
                    />
                  ) : (
                    displayTime(log.estimated_remaining)
                  )}
                </td>

                <td className="text-end">
                  {!finished && log.person?.id?.toString() === currentUserId?.toString() && (
                    <div className="d-flex flex-column align-items-end gap-1">
                      {editingLogId === log.id ? (
                        <Button size="sm" variant="primary" onClick={() => handleSave(log.id)}>
                          Save
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => handleEdit(log)}
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(log.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted text-center">
                  No logs found.
                </td>
              </tr>
              
            )}
          </tbody>
        </Table>
      )}
      {logs.length > 0 && (
        <div className="mt-3 text-muted d-flex align-items-center gap-2">
            ⏳ <strong>Estimated Time Remaining:</strong>{" "}
            <span className={remaining < 0 ? "text-danger fw-bold" : ""}>
            {displayTime(remaining)}
            </span>

            {/* //{currentUserId == assignee && !finished && !editingTimeRequired && (
            // <Button
            //     size="sm"
            //     variant="link"
            //     className="p-0 align-baseline ms-2"
            //     onClick={() => setEditingTimeRequired(true)}
            // >
            //     Edit
            // </Button>
            //)} */}

            {editingTimeRequired && (
            <>
                <Form.Control
                type="number"
                step={0.1}
                min={0}
                value={timeRequiredDraft}
                onChange={(e) => setTimeRequiredDraft(parseFloat(e.target.value))}
                style={{ maxWidth: "80px" }}
                size="sm"
                />
                <Button size="sm" onClick={handleUpdateTimeRequired}>
                Save
                </Button>
                <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                    setEditingTimeRequired(false);
                    setTimeRequiredDraft(timeRequired);
                }}
                >
                Cancel
                </Button>
            </>
            )}
        </div>
        )}

    </div>
  );
};

export default TimeLogPanel;
