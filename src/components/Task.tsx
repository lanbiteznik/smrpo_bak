import React from 'react';

interface TaskProps {
  id: string;
  title: string;
  description: string;
  points: number;
  assignee?: string;
  status: 'todo' | 'in-progress' | 'done';
}

const Task: React.FC<TaskProps> = ({ title, description, points, assignee }) => {
  return (
    <div className="bg-white p-4 rounded shadow mb-2">
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
      <div className="mt-2 flex justify-between items-center">
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
          {points} points
        </span>
        {assignee && (
          <span className="text-xs text-gray-500">
            Assigned to: {assignee}
          </span>
        )}
      </div>
    </div>
  );
};

export default Task;
