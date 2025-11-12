import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkCommitteePermission, PermissionRequest } from '../middleware/permissions';
import { TaskStatus, PermissionLevel } from '../types/enums';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  committeeId: z.string(),
  dueDate: z.string().datetime().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  dueDate: z.string().datetime().optional(),
  position: z.number().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  position: z.number().optional(),
});

// Get tasks for a committee
router.get(
  '/committee/:committeeId',
  authenticate,
  checkCommitteePermission(PermissionLevel.MEMBER),
  async (req: PermissionRequest, res) => {
    try {
      const { committeeId } = req.params;

      const tasks = await prisma.task.findMany({
        where: { committeeId },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: [
          {
            status: 'asc',
          },
          {
            position: 'asc',
          },
        ],
      });

      res.json(tasks);
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get single task
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        committee: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check user has access to this committee
    const isAdmin = await prisma.organization.findFirst({
      where: {
        id: task.committee.organizationId,
        adminUserId: userId,
      },
    });

    if (!isAdmin) {
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: {
                where: { committeeId: task.committeeId },
              },
            },
          },
        },
      });

      const hasAccess = userRoles.some((ur) =>
        ur.role.permissions.some(
          (p) => p.permissionLevel !== PermissionLevel.NONE
        )
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task (leader only)
router.post(
  '/',
  authenticate,
  checkCommitteePermission(PermissionLevel.LEADER),
  async (req: PermissionRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { title, description, committeeId, dueDate, assigneeIds } =
        createTaskSchema.parse(req.body);

      // Get highest position in the TODO column
      const lastTask = await prisma.task.findFirst({
        where: {
          committeeId,
          status: TaskStatus.TODO,
        },
        orderBy: {
          position: 'desc',
        },
      });

      const position = lastTask ? lastTask.position + 1 : 0;

      const task = await prisma.task.create({
        data: {
          title,
          description,
          committeeId,
          createdById: userId,
          dueDate: dueDate ? new Date(dueDate) : null,
          position,
          assignees: assigneeIds
            ? {
                create: assigneeIds.map((assigneeId) => ({
                  userId: assigneeId,
                })),
              }
            : undefined,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update task (leader only)
router.put(
  '/:id',
  authenticate,
  async (req: PermissionRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const data = updateTaskSchema.parse(req.body);

      // Get task to check committee
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: { committee: true },
      });

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if user is leader
      const isAdmin = await prisma.organization.findFirst({
        where: {
          id: existingTask.committee.organizationId,
          adminUserId: userId,
        },
      });

      let isLeader = !!isAdmin;

      if (!isAdmin) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId },
          include: {
            role: {
              include: {
                permissions: {
                  where: { committeeId: existingTask.committeeId },
                },
              },
            },
          },
        });

        isLeader = userRoles.some((ur) =>
          ur.role.permissions.some(
            (p) => p.permissionLevel === PermissionLevel.LEADER
          )
        );
      }

      if (!isLeader) {
        return res.status(403).json({
          error: 'Insufficient permissions. Leader access required.',
        });
      }

      const { assigneeIds, ...taskData } = data;

      // Update task
      const task = await prisma.task.update({
        where: { id },
        data: {
          ...taskData,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          status: data.status as TaskStatus | undefined,
        },
      });

      // Update assignees if provided
      if (assigneeIds) {
        // Remove existing assignees
        await prisma.taskAssignment.deleteMany({
          where: { taskId: id },
        });

        // Add new assignees
        if (assigneeIds.length > 0) {
          await prisma.taskAssignment.createMany({
            data: assigneeIds.map((assigneeId) => ({
              taskId: id,
              userId: assigneeId,
            })),
          });
        }
      }

      // Fetch updated task with relations
      const updatedTask = await prisma.task.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update task status (member can do this)
router.patch(
  '/:id/status',
  authenticate,
  async (req: PermissionRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { status, position } = updateTaskStatusSchema.parse(req.body);

      // Get task to check committee
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: { committee: true },
      });

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if user has member or leader access
      const isAdmin = await prisma.organization.findFirst({
        where: {
          id: existingTask.committee.organizationId,
          adminUserId: userId,
        },
      });

      let hasAccess = !!isAdmin;

      if (!isAdmin) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId },
          include: {
            role: {
              include: {
                permissions: {
                  where: { committeeId: existingTask.committeeId },
                },
              },
            },
          },
        });

        hasAccess = userRoles.some((ur) =>
          ur.role.permissions.some(
            (p) => p.permissionLevel !== PermissionLevel.NONE
          )
        );
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update task status
      const task = await prisma.task.update({
        where: { id },
        data: {
          status: status as TaskStatus,
          position: position ?? existingTask.position,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update task status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete task (leader only)
router.delete(
  '/:id',
  authenticate,
  async (req: PermissionRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Get task to check committee
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: { committee: true },
      });

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if user is leader
      const isAdmin = await prisma.organization.findFirst({
        where: {
          id: existingTask.committee.organizationId,
          adminUserId: userId,
        },
      });

      let isLeader = !!isAdmin;

      if (!isAdmin) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId },
          include: {
            role: {
              include: {
                permissions: {
                  where: { committeeId: existingTask.committeeId },
                },
              },
            },
          },
        });

        isLeader = userRoles.some((ur) =>
          ur.role.permissions.some(
            (p) => p.permissionLevel === PermissionLevel.LEADER
          )
        );
      }

      if (!isLeader) {
        return res.status(403).json({
          error: 'Insufficient permissions. Leader access required.',
        });
      }

      await prisma.task.delete({
        where: { id },
      });

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Add comment to task (member can do this)
router.post(
  '/:id/comments',
  authenticate,
  async (req: PermissionRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

      // Get task to check committee
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: { committee: true },
      });

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if user has member or leader access
      const isAdmin = await prisma.organization.findFirst({
        where: {
          id: existingTask.committee.organizationId,
          adminUserId: userId,
        },
      });

      let hasAccess = !!isAdmin;

      if (!isAdmin) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId },
          include: {
            role: {
              include: {
                permissions: {
                  where: { committeeId: existingTask.committeeId },
                },
              },
            },
          },
        });

        hasAccess = userRoles.some((ur) =>
          ur.role.permissions.some(
            (p) => p.permissionLevel !== PermissionLevel.NONE
          )
        );
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          taskId: id,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
