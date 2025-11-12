import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkIsAdmin } from '../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    committee: true,
                  },
                },
              },
            },
          },
        },
        adminOrganizations: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users in organization (admin only)
router.get('/', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Find organization
    const organization = await prisma.organization.findFirst({
      where: { adminUserId: userId },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get all users who have roles in this organization
    const usersWithRoles = await prisma.userRole.findMany({
      where: {
        role: {
          organizationId: organization.id,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
        role: true,
      },
    });

    // Group by user
    const usersMap = new Map();

    for (const userRole of usersWithRoles) {
      const userId = userRole.user.id;

      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          ...userRole.user,
          roles: [],
        });
      }

      usersMap.get(userId).roles.push(userRole.role);
    }

    // Also include the admin user
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (adminUser && !usersMap.has(adminUser.id)) {
      usersMap.set(adminUser.id, {
        ...adminUser,
        roles: [],
        isAdmin: true,
      });
    }

    const users = Array.from(usersMap.values());

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin can update any, users can update themselves)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name } = z.object({
      name: z.string().min(1).optional(),
    }).parse(req.body);

    // Check if user is admin or updating themselves
    const isAdmin = await prisma.organization.findFirst({
      where: { adminUserId: userId },
    });

    if (!isAdmin && id !== userId) {
      return res.status(403).json({
        error: 'You can only update your own profile',
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate user (admin only)
router.post('/:id/deactivate', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reactivate user (admin only)
router.post('/:id/activate', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
