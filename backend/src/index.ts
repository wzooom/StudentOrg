import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

console.log('[Server] Initializing server...');
console.log('[Server] Loading routes...');

// Load routes dynamically
(async () => {
  try {
    console.log('[Server] Importing auth routes...');
    const authRoutes = (await import('./routes/auth')).default;
    app.use('/api/auth', authRoutes);

    console.log('[Server] Importing organization routes...');
    const organizationRoutes = (await import('./routes/organization')).default;
    app.use('/api/organizations', organizationRoutes);

    console.log('[Server] Importing roles routes...');
    const rolesRoutes = (await import('./routes/roles')).default;
    app.use('/api/roles', rolesRoutes);

    console.log('[Server] Importing committees routes...');
    const committeesRoutes = (await import('./routes/committees')).default;
    app.use('/api/committees', committeesRoutes);

    console.log('[Server] Importing tasks routes...');
    const tasksRoutes = (await import('./routes/tasks')).default;
    app.use('/api/tasks', tasksRoutes);

    console.log('[Server] Importing users routes...');
    const usersRoutes = (await import('./routes/users')).default;
    app.use('/api/users', usersRoutes);

    console.log('[Server] All routes loaded successfully');

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('[Server] Error loading routes:', error);
    process.exit(1);
  }
})();

export default app;
