# Arhitecture of the project
## prisma
Contains configurations and db table models for Prisma ORM

## public
Stores all the static content (images, icons, fonts, ...)

## src
### app
Main routing structure. For example: subfolder users and its page.tsx would translate into http://localhost:3000/users in the running app

/api folder contains logic for handling user inputs via GET and POST requests

### components
Contains reusable React components that can be used for displaying content to user by importing then in the relevant page.tsx in the /app

### lib
Contains stuff needed for application to work eg. function that initializes the database connection