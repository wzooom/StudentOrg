// Enum constants for SQLite compatibility
export const PermissionLevel = {
  NONE: 'NONE',
  MEMBER: 'MEMBER',
  LEADER: 'LEADER',
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
