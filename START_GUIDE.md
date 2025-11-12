# Quick Start Guide - Student Organization Manager

## ✅ Your System is Ready!

The database has been set up with **SQLite** (no server required!) and seeded with sample data.

## Starting the Application

### Option 1: Using Two Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd /Users/willzumbolo/Desktop/projects/StudentOrg/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/willzumbolo/Desktop/projects/StudentOrg/frontend
npm run dev
```

### Option 2: Using the Start Script

```bash
cd /Users/willzumbolo/Desktop/projects/StudentOrg
./start.sh
```

## Access the Application

Once both servers are running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Test Accounts

You can log in with any of these pre-seeded accounts:

### 1. Admin Account (Full Access)
- **Email**: admin@university.edu
- **Password**: admin123
- **Permissions**: Can manage everything (roles, committees, users)

### 2. President Account
- **Email**: john@university.edu
- **Password**: password123
- **Role**: President with leader access to all committees

### 3. Committee Chair Account
- **Email**: jane@university.edu
- **Password**: password123
- **Role**: Committee Chair with leader access to Events, member access to Marketing

### 4. General Member Account
- **Email**: bob@university.edu
- **Password**: password123
- **Role**: Member with access to Events and Marketing committees

## Or Create a New Account

You can also register a new account at: http://localhost:5173/register

## What to Try

### As Admin (admin@university.edu)
1. Click **Admin Panel** button
2. Create new roles and committees
3. Assign roles to users
4. Set permissions for each role on each committee

### As Any User
1. View your accessible committees on the dashboard
2. Click on a committee to see its kanban board
3. Drag tasks between columns (To Do → In Progress → Done)
4. Click on a task to view details and add comments
5. If you're a leader, create new tasks with the "+ New Task" button

## Database Information

- **Type**: SQLite (file-based, no server needed)
- **Location**: `/Users/willzumbolo/Desktop/projects/StudentOrg/backend/dev.db`
- **View Database**: `cd backend && npm run prisma:studio`
  - Opens Prisma Studio at http://localhost:5555
  - Browse and edit data visually

## Troubleshooting

### Backend won't start
```bash
cd backend
# Check if port 3001 is in use
lsof -ti:3001 | xargs kill -9
npm run dev
```

### Frontend won't start
```bash
cd frontend
# Check if port 5173 is in use
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Reset Database
```bash
cd backend
rm dev.db
rm -rf prisma/migrations
npx prisma migrate dev --name init
npm run prisma:seed
```

### "Cannot find module" errors
```bash
# In backend directory
npm install
npm run prisma:generate

# In frontend directory
npm install
```

## Development Commands

### Backend
```bash
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run prisma:studio # Open database GUI
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Features Implemented

✅ User authentication (register/login)
✅ Organization management
✅ Role-based access control
✅ Committee management
✅ Kanban task boards with drag-and-drop
✅ Task assignments and comments
✅ Permission system (None/Member/Leader per committee)
✅ Admin panel for managing roles and permissions
✅ Responsive design for mobile and desktop

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite with Prisma ORM
- **Auth**: JWT tokens with bcrypt password hashing
- **State**: Zustand for global state management
- **Drag-Drop**: @dnd-kit for kanban functionality

## Next Steps

1. **Explore the App**: Log in with different accounts to see different permission levels
2. **Create Content**: Add new committees, roles, and tasks
3. **Test Permissions**: Try accessing features with different user roles
4. **Customize**: Modify the code to fit your organization's needs

## Support

If you encounter any issues:
1. Check that both backend and frontend are running
2. Clear browser cache and reload
3. Check the terminal for error messages
4. Restart both servers

---

**Ready to go!** 🚀

Start with: `npm run dev` in both backend and frontend directories.
