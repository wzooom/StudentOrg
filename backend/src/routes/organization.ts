import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkIsAdmin } from '../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

// Create organization (only if none exists for this user)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const data = createOrganizationSchema.parse(req.body);

    // Check if user already has an organization
    const existingOrg = await prisma.organization.findFirst({
      where: { adminUserId: userId },
    });

    if (existingOrg) {
      return res.status(400).json({
        error: 'Organization already exists for this user',
      });
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        ...data,
        adminUserId: userId,
      },
    });

    res.status(201).json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's organization
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Try to find organization where user is admin
    let organization = await prisma.organization.findFirst({
      where: { adminUserId: userId },
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // If not admin, find through role membership
    if (!organization) {
      const userRole = await prisma.userRole.findFirst({
        where: { userId },
        include: {
          role: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (userRole) {
        organization = userRole.role.organization as any;
      }
    }

    if (!organization) {
      return res.status(404).json({ error: 'No organization found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organization (admin only)
router.put('/:id', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateOrganizationSchema.parse(req.body);

    const organization = await prisma.organization.update({
      where: { id },
      data,
    });

    res.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
