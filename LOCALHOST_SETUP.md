# ✅ Localhost Setup Complete!

## What Was Fixed

The internal server error you experienced was due to **no database being configured**. I've fixed this by:

1. **Switched to SQLite** - No database server needed! Everything runs locally
2. **Created .env files** - Backend and frontend are now properly configured
3. **Fixed enum compatibility** - Updated code to work with SQLite (doesn't support PostgreSQL enums)
4. **Migrated database** - Created all tables and schema
5. **Seeded sample data** - Pre-loaded test accounts and sample committees/tasks

## Changes Made

### Database Configuration
- **From**: PostgreSQL (requires server setup)
- **To**: SQLite (file-based, no setup needed)
- **Location**: `backend/dev.db`

### Backend Changes
1. Created `backend/.env`:
   ```
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="development-secret-key"
   PORT=3001
   ```

2. Updated Prisma schema to use SQLite
3. Created enum compatibility layer (`src/types/enums.ts`)
4. Updated all routes to use string-based enums

### Frontend Changes
1. Created `frontend/.env`:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```

## Your System is Now Ready! 🎉

### Backend is Running ✅
- URL: http://localhost:3001
- Database: SQLite (dev.db)
- Test: http://localhost:3001/health should return `{"status":"ok"}`

### Test Registration ✅
I tested creating a new account and it works perfectly:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'
```

Response: User created successfully with JWT token!

## How to Use

### Start Frontend
Open a new terminal and run:
```bash
cd /Users/willzumbolo/Desktop/projects/StudentOrg/frontend
npm run dev
```

Then visit: **http://localhost:5173**

### Pre-loaded Test Accounts

You can skip registration and use these accounts:

1. **Admin** (Full system access)
   - Email: `admin@university.edu`
   - Password: `admin123`

2. **President** (Leader on all committees)
   - Email: `john@university.edu`
   - Password: `password123`

3. **Committee Chair** (Leader on Events, Member on Marketing)
   - Email: `jane@university.edu`
   - Password: `password123`

4. **General Member** (Member on Events and Marketing)
   - Email: `bob@university.edu`
   - Password: `password123`

### Or Create Your Own Account
Go to http://localhost:5173/register and create a new account!

## What You Can Do Now

### As Admin
- Create roles (President, Treasurer, etc.)
- Create committees (Events, Marketing, Finance)
- Set permissions for each role on each committee
- Assign roles to users
- Manage all committees and tasks

### As Leader
- Create and manage tasks in your committees
- Assign tasks to members
- Edit and delete tasks
- View all committee activity

### As Member
- View committees you have access to
- Move tasks between columns (drag & drop)
- Add comments to tasks
- Mark tasks as done

## Sample Data Included

The database comes pre-loaded with:
- 4 test users (admin, president, committee chair, member)
- 1 organization (Computer Science Student Association)
- 3 roles with different permission levels
- 3 committees (Events, Marketing, Finance)
- 4 sample tasks with assignments and comments

## File Structure

```
StudentOrg/
├── backend/
│   ├── dev.db              # SQLite database (auto-created)
│   ├── .env                # Backend configuration
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema (SQLite)
│   │   └── migrations/     # Database migrations
│   └── src/
│       ├── types/
│       │   └── enums.ts    # Enum definitions for SQLite
│       └── routes/         # All API endpoints
├── frontend/
│   ├── .env                # Frontend configuration
│   └── src/
│       ├── components/     # React components
│       ├── pages/          # Page components
│       └── lib/
│           └── api.ts      # API client (connects to backend)
├── start.sh                # Start both servers at once
├── START_GUIDE.md          # Detailed usage guide
└── LOCALHOST_SETUP.md      # This file
```

## Common Commands

### View Database
```bash
cd backend
npm run prisma:studio
```
Opens visual database browser at http://localhost:5555

### Reset Everything
```bash
cd backend
rm dev.db
rm -rf prisma/migrations
npx prisma migrate dev --name init
npm run prisma:seed
```

### Check Backend Logs
Since I started the backend in the background, check logs with:
```bash
# View all output
tail -f backend/logs.txt  # (if you redirect output)

# Or restart backend in foreground to see logs
cd backend
npm run dev
```

## Why SQLite?

SQLite is perfect for local development and testing:

✅ No server setup required
✅ Single file database
✅ Fast and reliable
✅ Perfect for prototyping
✅ Easy to backup (just copy dev.db)
✅ Easy to reset (just delete dev.db)

**For production**, you can easily switch back to PostgreSQL by:
1. Changing `provider = "sqlite"` to `provider = "postgresql"` in schema.prisma
2. Updating DATABASE_URL to point to PostgreSQL
3. Running `npx prisma migrate dev`

## Troubleshooting

### "Port already in use"
```bash
# Kill backend (port 3001)
lsof -ti:3001 | xargs kill -9

# Kill frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

### "CORS error" in browser
Make sure:
1. Backend is running on port 3001
2. Frontend .env has `VITE_API_URL=http://localhost:3001/api`
3. Restart frontend after changing .env

### "Cannot connect to database"
```bash
cd backend
# Regenerate database
rm dev.db
npx prisma migrate dev --name init
npm run prisma:seed
```

## Next Steps

1. ✅ **Start Frontend**: `cd frontend && npm run dev`
2. 🎯 **Open Browser**: http://localhost:5173
3. 🔐 **Login**: Use any test account or create new one
4. 🚀 **Explore**: Create committees, tasks, assign roles!

## Success Indicators

You'll know everything is working when:
- ✅ Backend responds at http://localhost:3001/health
- ✅ Frontend loads at http://localhost:5173
- ✅ You can register a new account
- ✅ You can login with test accounts
- ✅ Dashboard shows committees (when logged in as test users)
- ✅ Admin panel is accessible (when logged in as admin)

---

**Everything is configured and ready to use!** 🎊

The issue was simply that no database was configured. Now with SQLite, you have a fully functional local development environment with zero external dependencies.
