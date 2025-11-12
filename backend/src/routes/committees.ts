import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkIsAdmin } from '../middleware/permissions';
import { PermissionLevel } from '../types/enums';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createCommitteeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  organizationId: z.string(),
});

const updateCommitteeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// Get all committees (user sees ones they have access to)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Find user's organization
    let organizationId: string | null = null;

    const organization = await prisma.organization.findFirst({
      where: { adminUserId: userId },
    });

    if (organization) {
      organizationId = organization.id;
    } else {
      const userRole = await prisma.userRole.findFirst({
        where: { userId },
        include: {
          role: true,
        },
      });

      if (userRole) {
        organizationId = userRole.role.organizationId;
      }
    }

    if (!organizationId) {
      return res.status(404).json({ error: 'No organization found' });
    }

    // Get all committees for the organization
    const committees = await prisma.committee.findMany({
      where: { organizationId },
      include: {
        permissions: {
          include: {
            role: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // For non-admin users, get their permissions for each committee
    const isAdmin = organization !== null;

    if (!isAdmin) {
      // Get user's roles
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      // Calculate user's permission for each committee
      const committeesWithPermissions = committees.map((committee) => {
        let highestPermission: PermissionLevel = PermissionLevel.NONE;

        for (const userRole of userRoles) {
          const permission = userRole.role.permissions.find(
            (p) => p.committeeId === committee.id
          );
          if (permission) {
            if (permission.permissionLevel === PermissionLevel.LEADER) {
              highestPermission = PermissionLevel.LEADER;
              break;
            }
            if (
              permission.permissionLevel === PermissionLevel.MEMBER &&
              highestPermission === PermissionLevel.NONE
            ) {
              highestPermission = PermissionLevel.MEMBER;
            }
          }
        }

        return {
          ...committee,
          userPermission: highestPermission,
        };
      });

      // Filter to only show committees user has access to
      const accessibleCommittees = committeesWithPermissions.filter(
        (c) => c.userPermission !== PermissionLevel.NONE
      );

      return res.json(accessibleCommittees);
    }

    // Admin sees all committees with LEADER permission
    const committeesWithPermissions = committees.map((committee) => ({
      ...committee,
      userPermission: PermissionLevel.LEADER,
    }));

    res.json(committeesWithPermissions);
  } catch (error) {
    console.error('Get committees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single committee by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const committee = await prisma.committee.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            role: {
              include: {
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
            },
          },
        },
        tasks: {
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
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!committee) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    // Check if user is admin
    const isAdmin = await prisma.organization.findFirst({
      where: {
        id: committee.organizationId,
        adminUserId: userId,
      },
    });

    let userPermission: PermissionLevel = PermissionLevel.NONE;

    if (isAdmin) {
      userPermission = PermissionLevel.LEADER;
    } else {
      // Get user's permission
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: {
                where: { committeeId: id },
              },
            },
          },
        },
      });

      for (const userRole of userRoles) {
        for (const permission of userRole.role.permissions) {
          if (permission.permissionLevel === PermissionLevel.LEADER) {
            userPermission = PermissionLevel.LEADER;
            break;
          }
          if (
            permission.permissionLevel === PermissionLevel.MEMBER &&
            userPermission === PermissionLevel.NONE
          ) {
            userPermission = PermissionLevel.MEMBER;
          }
        }
        if (userPermission === PermissionLevel.LEADER) break;
      }
    }

    if (userPermission === PermissionLevel.NONE) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      ...committee,
      userPermission,
    });
  } catch (error) {
    console.error('Get committee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create committee (admin only)
router.post('/', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const data = createCommitteeSchema.parse(req.body);

    const committee = await prisma.committee.create({
      data,
    });

    res.status(201).json(committee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create committee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update committee (admin only)
router.put('/:id', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateCommitteeSchema.parse(req.body);

    const committee = await prisma.committee.update({
      where: { id },
      data,
    });

    res.json(committee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update committee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete committee (admin only)
router.delete('/:id', authenticate, checkIsAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.committee.delete({
      where: { id },
    });

    res.json({ message: 'Committee deleted successfully' });
  } catch (error) {
    console.error('Delete committee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
