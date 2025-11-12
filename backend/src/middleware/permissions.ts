import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { PrismaClient } from '@prisma/client';
import { PermissionLevel } from '../types/enums';

const prisma = new PrismaClient();

export interface PermissionRequest extends AuthRequest {
  userPermission?: PermissionLevel;
  isAdmin?: boolean;
}

export const checkCommitteePermission = (
  requiredLevel: PermissionLevel | 'ADMIN'
) => {
  return async (
    req: PermissionRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.userId;
      const committeeId = req.params.committeeId || req.body.committeeId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!committeeId) {
        return res.status(400).json({ error: 'Committee ID required' });
      }

      // Check if user is organization admin
      const organization = await prisma.organization.findFirst({
        where: { adminUserId: userId },
      });

      if (organization && requiredLevel === 'ADMIN') {
        req.isAdmin = true;
        return next();
      }

      // Get user's roles and their permissions for this committee
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: {
                where: { committeeId },
              },
            },
          },
        },
      });

      // Find the highest permission level
      let highestPermission: PermissionLevel = PermissionLevel.NONE;

      for (const userRole of userRoles) {
        for (const permission of userRole.role.permissions) {
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
        if (highestPermission === PermissionLevel.LEADER) break;
      }

      req.userPermission = highestPermission;

      // Check if user has required permission level
      if (requiredLevel === PermissionLevel.LEADER) {
        if (highestPermission !== PermissionLevel.LEADER) {
          return res.status(403).json({
            error: 'Insufficient permissions. Leader access required.',
          });
        }
      } else if (requiredLevel === PermissionLevel.MEMBER) {
        if (
          highestPermission !== PermissionLevel.MEMBER &&
          highestPermission !== PermissionLevel.LEADER
        ) {
          return res.status(403).json({
            error: 'Insufficient permissions. Member access required.',
          });
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const checkIsAdmin = async (
  req: PermissionRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organization = await prisma.organization.findFirst({
      where: { adminUserId: userId },
    });

    if (!organization) {
      return res.status(403).json({
        error: 'Admin access required',
      });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
