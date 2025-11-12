export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  adminUserId: string;
}

export const PermissionLevel = {
  NONE: 'NONE',
  MEMBER: 'MEMBER',
  LEADER: 'LEADER',
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

export interface Role {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  permissions: RoleCommitteePermission[];
}

export interface RoleCommitteePermission {
  id: string;
  roleId: string;
  committeeId: string;
  permissionLevel: PermissionLevel;
  committee?: Committee;
}

export interface Committee {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  userPermission?: PermissionLevel;
  tasks?: Task[];
}

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  committeeId: string;
  createdById: string;
  dueDate?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  assignees: TaskAssignment[];
  comments?: Comment[];
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  user: User;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRoles extends User {
  roles: Role[];
  isAdmin?: boolean;
}
