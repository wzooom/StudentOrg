import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkIsAdmin } from '../middleware/permissions';
import { PermissionLevel } from '../types/enums';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  organizationId: z.string(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const assignRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

const setPermissionsSchema = z.object({
  roleId: z.string(),
  permissions: z.array(
    z.object({
      committeeId: z.string(),
      permissionLevel: z.enum(['NONE', 'MEMBER', 'LEADER']),
    })
  ),
});

// Get all roles for organization
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Find user's organization
    const organization = await prisma.organization.findFirst({
      where: { adminUserId: userId },
    });

    if (!organization) {
      // Try to find through role membership
      const userRole = await prisma.userRole.findFirst({
        where: { userId },
        include: {
          role: true,
        },
      });

      if (!userRole) {
        return res.status(404).json({ error: 'No organization found' });
      }

      const roles = await prisma.role.findMany({
        where: { organizationId: userRole.role.organizationId },
        include: {
          permissions: {
            include: {
              committee: true,
            },
          },
          userRoles: {
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

      return res.json(roles);
    }

    const roles = await prisma.role.findMany({
      where: { organizationId: organization.id },
      include: {
        permissions: {
          include: {
            committee: true,
          },
        },
        userRoles: {
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

    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create role (admin only)
router.post('/', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const data = createRoleSchema.parse(req.body);

    const role = await prisma.role.create({
      data,
      include: {
        permissions: true,
      },
    });

    res.status(201).json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update role (admin only)
router.put('/:id', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateRoleSchema.parse(req.body);

    const role = await prisma.role.update({
      where: { id },
      data,
      include: {
        permissions: true,
      },
    });

    res.json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete role (admin only)
router.delete('/:id', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.role.delete({
      where: { id },
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign role to user (admin only)
router.post('/assign', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, roleId } = assignRoleSchema.parse(req.body);

    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        role: true,
      },
    });

    res.status(201).json(userRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove role from user (admin only)
router.delete('/assign/:userId/:roleId', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, roleId } = req.params;

    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });

    res.json({ message: 'Role removed from user successfully' });
  } catch (error) {
    console.error('Remove role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set permissions for a role (admin only)
router.post('/permissions', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { roleId, permissions } = setPermissionsSchema.parse(req.body);

    // Delete existing permissions for this role
    await prisma.roleCommitteePermission.deleteMany({
      where: { roleId },
    });

    // Create new permissions (only for non-NONE levels)
    const permissionsToCreate = permissions
      .filter((p) => p.permissionLevel !== 'NONE')
      .map((p) => ({
        roleId,
        committeeId: p.committeeId,
        permissionLevel: p.permissionLevel as PermissionLevel,
      }));

    if (permissionsToCreate.length > 0) {
      await prisma.roleCommitteePermission.createMany({
        data: permissionsToCreate,
      });
    }

    // Fetch updated role with permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            committee: true,
          },
        },
      },
    });

    res.json(updatedRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Set permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
