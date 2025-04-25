export interface Subtask {
  id?: number;
  description: string;
  time_required?: number;
  assignee?: number;
  priority?: number;
  story_id: number;
  finished: boolean;
  created_at?: Date;
  rejected?: boolean;
  accepted?: boolean;
  person?: {
    id: number;
    username: string;
    name: string;
    lastname: string;
  };
}

export interface Story {
  id: number;
  title?: string;
  description?: string;
  time_required?: number;
  business_value?: number;
  priority?: number;
  sprint_id?: number;
  project_id?: number;
  active?: boolean;
  finished?: boolean;
  rejected?: boolean;
  accepted?: boolean;
  created_at?: Date;
  subtasks?: Subtask[];
  tests?: string;
  rejected_description?: string;
  returned_from_sprint?: boolean;
} 