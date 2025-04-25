CREATE TABLE IF NOT EXISTS person (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    email VARCHAR(127) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(32) NOT NULL,
    lastname VARCHAR(32) NOT NULL,
    role INTEGER NOT NULL,
    last_login TIMESTAMP,
    previous_login TIMESTAMP,
    active BOOLEAN
);
CREATE TABLE IF NOT EXISTS project (
    id SERIAL PRIMARY KEY,
    title VARCHAR(64),
    description TEXT,
    tickets TEXT,
    sprints TEXT,
    users TEXT,
    created_at TIMESTAMP,
    docs TEXT,
    active BOOLEAN,
    comments TEXT
);

CREATE TABLE IF NOT EXISTS sprint (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    start_date TIMESTAMP,
    finish_date TIMESTAMP,
    velocity INT,
    tickets TEXT,
    project_id INT REFERENCES project(id),
    active BOOLEAN
);

CREATE TABLE IF NOT EXISTS story (
    id SERIAL PRIMARY KEY,
    title VARCHAR(64),
    description TEXT,
    time_required INT,
    assignee VARCHAR(255),
    priority INT,
    business_value INT,
    subtasksCount INT,
    tests TEXT,
    created_at TIMESTAMP,
    project_id INT,
    active BOOLEAN,
    finished BOOLEAN,
    sprint_id INT,
    rejected BOOLEAN,
    rejected_time_required INT,
    rejected_description TEXT,
    FOREIGN KEY (project_id) REFERENCES project(id),
    FOREIGN KEY (sprint_id) REFERENCES sprint(id)
);

CREATE TABLE IF NOT EXISTS subtask (
    id SERIAL PRIMARY KEY,
    description TEXT,
    time_required INT,
    assignee INT REFERENCES person(id),
    priority INT,
    created_at TIMESTAMP,
    story_id INT REFERENCES story(id),
    finished BOOLEAN,
    rejected BOOLEAN
);

CREATE TABLE IF NOT EXISTS wall_post (
    id SERIAL PRIMARY KEY,
    title VARCHAR(64),
    description TEXT,
    created_at TIMESTAMP,
    project_id INT REFERENCES project(id),
    person_id INT REFERENCES person(id)
);

CREATE TABLE IF NOT EXISTS post_comment (
    id SERIAL PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMP,
    wall_post_id INT REFERENCES wall_post(id),
    person_id INT REFERENCES person(id)
);