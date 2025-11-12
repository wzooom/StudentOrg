# Student Organization Management System

A full-stack web application for managing student organizations with role-based access control, committee management, and kanban-style task tracking.

## Features

### Core Functionality
- **Organization Management**: Admin setup with organization profile and branding
- **User Roles System**: Create custom roles with granular committee-level permissions
- **Committee Management**: Create and manage committees with member assignments
- **Kanban Task Board**: Drag-and-drop task management for each committee
- **Permission System**: Three-level permissions (None/Member/Leader) per committee
- **User Management**: Admin controls for user accounts and role assignments

### Permission Levels
- **None**: No access to the committee
- **Member**: View tasks, mark complete/incomplete, add comments
- **Leader**: All member permissions plus create/edit/delete tasks, assign tasks

## Tech Stack

### Backend
- Node.js with Express.js
- TypeScript for type safety
- PostgreSQL database
- Prisma ORM
- JWT authentication with bcrypt
- Zod for validation

### Frontend
- React with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- React Router for navigation
- Zustand for state management
- @dnd-kit for drag-and-drop
- Axios for API calls

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
cd student-org-manager
```

### 2. Set up the Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and configure your database
# Example: DATABASE_URL="postgresql://username:password@localhost:5432/student_org_db"
```

### 3. Set up the Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with sample data
npm run prisma:seed
```

### 4. Set up the Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# The default API URL is http://localhost:3001/api
```

## Running the Application

### Start the Backend

```bash
cd backend
npm run dev
```

The backend will run on http://localhost:3001

### Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on http://localhost:5173

## Test Credentials

After running the seed script, you can use these credentials:

- **Admin**: admin@university.edu / admin123
- **President**: john@university.edu / password123
- **Committee Chair**: jane@university.edu / password123
- **Member**: bob@university.edu / password123

## Project Structure

```
student-org-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Seed data
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT authentication
│   │   │   └── permissions.ts     # Permission checking
│   │   ├── routes/
│   │   │   ├── auth.ts            # Login/register
│   │   │   ├── organization.ts    # Organization management
│   │   │   ├── roles.ts           # Role management
│   │   │   ├── committees.ts      # Committee management
│   │   │   ├── tasks.ts           # Task management
│   │   │   └── users.ts           # User management
│   │   ├── utils/
│   │   │   ├── jwt.ts             # JWT utilities
│   │   │   └── password.ts        # Password hashing
│   │   └── index.ts               # Express server
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── auth/              # Login/Register
    │   │   ├── committees/        # Kanban board & tasks
    │   │   └── ProtectedRoute.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx      # Main dashboard
    │   │   ├── CommitteePage.tsx  # Committee view
    │   │   └── AdminPanel.tsx     # Admin interface
    │   ├── lib/
    │   │   └── api.ts             # API client
    │   ├── store/
    │   │   └── authStore.ts       # Auth state
    │   ├── types/
    │   │   └── index.ts           # TypeScript types
    │   └── App.tsx
    └── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Organizations
- `GET /api/organizations/me` - Get current user's organization
- `POST /api/organizations` - Create organization (admin)
- `PUT /api/organizations/:id` - Update organization (admin)

### Roles
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create role (admin)
- `PUT /api/roles/:id` - Update role (admin)
- `DELETE /api/roles/:id` - Delete role (admin)
- `POST /api/roles/assign` - Assign role to user (admin)
- `DELETE /api/roles/assign/:userId/:roleId` - Remove role from user (admin)
- `POST /api/roles/permissions` - Set role permissions (admin)

### Committees
- `GET /api/committees` - Get user's committees
- `GET /api/committees/:id` - Get committee details
- `POST /api/committees` - Create committee (admin)
- `PUT /api/committees/:id` - Update committee (admin)
- `DELETE /api/committees/:id` - Delete committee (admin)

### Tasks
- `GET /api/tasks/committee/:committeeId` - Get committee tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task (leader)
- `PUT /api/tasks/:id` - Update task (leader)
- `PATCH /api/tasks/:id/status` - Update task status (member)
- `DELETE /api/tasks/:id` - Delete task (leader)
- `POST /api/tasks/:id/comments` - Add comment (member)

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users` - Get all users (admin)
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/deactivate` - Deactivate user (admin)
- `POST /api/users/:id/activate` - Activate user (admin)

## Usage Guide

### For Admins

1. **Create Organization**: After logging in as admin, the dashboard will prompt you to create an organization if one doesn't exist.

2. **Create Roles**: Go to Admin Panel > Roles and create custom roles (e.g., "President", "Committee Chair", "Member").

3. **Create Committees**: Go to Admin Panel > Committees and create committees (e.g., "Events", "Marketing").

4. **Set Permissions**: In the Roles tab, set permissions for each role across committees:
   - Select a role
   - Choose permission level for each committee (None/Member/Leader)

5. **Assign Roles**: Go to Users tab and assign roles to registered users.

### For Users

1. **Register**: Create an account on the registration page.

2. **View Committees**: After login, see all committees you have access to on the dashboard.

3. **Manage Tasks**:
   - Click on a committee to view its kanban board
   - Drag tasks between columns (To Do, In Progress, Done)
   - Click on a task to view details and add comments
   - Leaders can create, edit, and delete tasks

## Security Features

- JWT-based authentication with secure token storage
- Password hashing using bcrypt (10 salt rounds)
- Role-based access control (RBAC) with permission middleware
- Input validation using Zod schemas
- SQL injection prevention via Prisma parameterized queries
- CORS configuration for API security

## Development

### Backend Development

```bash
cd backend

# Run in development mode with auto-reload
npm run dev

# Generate Prisma client after schema changes
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Frontend Development

```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Database Schema

The application uses the following main entities:

- **Organization**: Single org per deployment
- **User**: User accounts with authentication
- **Role**: Custom roles with descriptions
- **Committee**: Organizational committees
- **RoleCommitteePermission**: Junction table for role-committee permissions
- **UserRole**: Junction table for user-role assignments
- **Task**: Tasks within committees with status and assignments
- **TaskAssignment**: Junction table for task-user assignments
- **Comment**: Comments on tasks

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Verify database exists: `psql -U postgres -c "CREATE DATABASE student_org_db;"`

### Port Already in Use
- Backend: Change PORT in backend/.env
- Frontend: Vite will automatically suggest an alternative port

### CORS Issues
- Ensure frontend is making requests to the correct API URL
- Check VITE_API_URL in frontend/.env

## Future Enhancements

- Email notifications for task assignments
- File attachments on tasks
- Task due date reminders
- Activity log/audit trail
- Search and filter functionality
- Export committee reports
- Calendar view for tasks
- Mobile app version

## License

MIT

## Contributors

Built with Claude Code
