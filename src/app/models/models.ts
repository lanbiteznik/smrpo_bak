export interface Person {
    id: number;
    username: string;
    email: string;
    password: string;
    name: string;
    lastname: string;
    role: number;
    last_login?: Date | null;
    previous_login?: Date | null;
    active?: boolean | null;
    subtasks?: Subtask[] | null;
    wall_posts?: WallPost[] | null;
    post_comments?: PostComment[] | null;
  }
  
  export interface Project {
    id: number;
    title?: string;
    description?: string;
    tickets?: string;
    sprints?: string;
    users?: string;
    created_at?: Date;
    docs?: string;
    active?: boolean;
    comments?: string;
    wall_posts: WallPost[];
    sprintsRel: Sprint[];
    storiesRel: Story[];
  }
  
  export interface Story {
    id: number;
    title: string;
    description?: string;
    time_required?: number;
    assignee?: string;
    priority?: number;
    business_value?: number;
    subtasksCount?: number;
    tests?: string;
    created_at?: Date;
    project_id: number;
    active?: boolean;
    finished?: boolean;
    sprint_id: number;
    rejected?: boolean;
    rejected_time_required?: number;
    rejected_description?: string;
    subtasks: Subtask[];
    project: Project;
    sprint: Sprint;
  }
  
  export interface Subtask {
    id: number;
    description?: string;
    time_required?: number;
    assignee: number;
    priority?: number;
    created_at?: Date;
    story_id: number;
    finished?: boolean;
    rejected?: boolean;
    accepted?: boolean;
    person: Person;
    story: Story;
  }
  
  export interface Sprint {
    id: number;
    title: string;
    start_date?: Date;
    finish_date?: Date;
    velocity?: number;
    tickets?: string;
    project_id: number;
    active?: boolean;
    project: Project;
    stories: Story[];
  }
  
  export interface WallPost {
    id: number;
    title?: string;
    description?: string;
    created_at?: Date;
    project_id: number;
    person_id: number;
    project: Project;
    person: Person;
    comments: PostComment[];
  }
  
  export interface PostComment {
    id: number;
    description?: string;
    created_at?: Date;
    wall_post_id: number;
    person_id: number;
    wall_post: WallPost;
    person: Person;
  }